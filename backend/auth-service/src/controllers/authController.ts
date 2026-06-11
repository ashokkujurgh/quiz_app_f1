import { Response, RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import { createTokenPair, verifyRefreshToken } from '../utils/jwt';
import { getFirebaseAuth } from '../config/firebase';
import { deleteFileByUrl } from '../config/spaces';
import rabbitMQ from '../config/rabbitmq';
import { AuthRequest, IUser, MulterS3File } from '../types';

// ── Helpers ───────────────────────────────────────────────
export const handleValidation = (req: AuthRequest, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
};

export const sendAuthResponse = async (
  res: Response,
  req: AuthRequest,
  user: IUser,
  statusCode = 200
): Promise<void> => {
  const { accessToken, refreshToken, refreshExpiresAt } = createTokenPair(user);

  const fullUser = await User.findById(user._id).select('+refreshTokens');
  if (fullUser) {
    fullUser.refreshTokens.push({
      token: refreshToken,
      expiresAt: refreshExpiresAt,
      deviceInfo: req.headers['user-agent'] ?? 'unknown',
      createdAt: new Date(),
    });
    await fullUser.save({ validateBeforeSave: false });
  }

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.status(statusCode).json({ success: true, accessToken, user });
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/firebase
// Accepts a Firebase ID token from either email/password or
// Google OAuth sign-in. The client always sends the same shape.
// ═══════════════════════════════════════════════════════════
export const firebaseAuth: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) {
      res.status(400).json({ success: false, message: 'Firebase ID token is required.' });
      return;
    }

    const firebaseAdmin = getFirebaseAuth();
    const decoded = await firebaseAdmin.verifyIdToken(idToken);
    const { uid, email, name, picture, email_verified, firebase } = decoded;

    if (!email) {
      res.status(400).json({ success: false, message: 'No email associated with this account.' });
      return;
    }

    const provider = (firebase?.sign_in_provider === 'google.com') ? 'google' : 'firebase';

    let user = (await User.findOne({ $or: [{ firebaseUid: uid }, { email }] }).select('+refreshTokens')) as IUser | null;
    const isNewUser = !user;

    if (user) {
      if (!user.firebaseUid) user.firebaseUid = uid;
      if (picture && !user.avatar) user.avatar = picture;
      if (provider === 'google' && !user.googleId) user.googleId = uid;
      user.isOnline = true;
      user.lastSeen = new Date();
      user.isEmailVerified = email_verified ?? user.isEmailVerified;
      await user.save({ validateBeforeSave: false });
    } else {
      const created = await User.create({
        name: name ?? email.split('@')[0],
        email,
        firebaseUid: uid,
        googleId: provider === 'google' ? uid : undefined,
        avatar: picture ?? null,
        authProvider: provider,
        isEmailVerified: email_verified ?? false,
        isOnline: true,
      });
      user = (await User.findById(created._id).select('+refreshTokens')) as IUser | null;
    }

    if (!user) {
      res.status(500).json({ success: false, message: 'Failed to create user.' });
      return;
    }

    rabbitMQ.publish(isNewUser ? 'user.registered' : 'user.logged_in', {
      userId: user._id.toString(),
      email: user.email,
      authProvider: provider,
    }).catch(console.error);

    await sendAuthResponse(res, req, user as IUser, isNewUser ? 201 : 200);
  } catch (err) {
    const error = err as { code?: string; message?: string };
    console.error('Firebase auth error:', error);
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({ success: false, message: 'Token expired. Please sign in again.' });
      return;
    }
    res.status(401).json({ success: false, message: 'Firebase authentication failed.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/refresh
// ═══════════════════════════════════════════════════════════
export const refreshToken: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const token: string | undefined =
      req.cookies?.refreshToken ?? (req.body as { refreshToken?: string }).refreshToken;
    if (!token) {
      res.status(401).json({ success: false, message: 'No refresh token.' });
      return;
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found.' });
      return;
    }

    const stored = user.refreshTokens.find(
      (t) => t.token === token && new Date(t.expiresAt) > new Date()
    );
    if (!stored) {
      res.status(401).json({ success: false, message: 'Refresh token invalid or expired.' });
      return;
    }

    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
    await sendAuthResponse(res, req, user);
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/logout
// ═══════════════════════════════════════════════════════════
export const logout: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const token: string | undefined = req.cookies?.refreshToken;
    const user = await User.findById(req.user!._id).select('+refreshTokens');
    if (user) {
      user.refreshTokens = token
        ? user.refreshTokens.filter((t) => t.token !== token)
        : [];
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save({ validateBeforeSave: false });
    }

    rabbitMQ.publish('user.logged_out', { userId: req.user!._id.toString() }).catch(console.error);

    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, message: 'Logout failed.' });
  }
};

// ═══════════════════════════════════════════════════════════
// GET /api/auth/me
// ═══════════════════════════════════════════════════════════
export const getMe: RequestHandler = (req: AuthRequest, res: Response): void => {
  res.json({ success: true, user: req.user });
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/upload/avatar
// ═══════════════════════════════════════════════════════════
export const uploadAvatar = (req: AuthRequest, res: Response): void => {
  try {
    const file = req.file as MulterS3File;
    User.findById(req.user!._id).then(async (user) => {
      if (!user) { res.status(404).json({ success: false, message: 'User not found.' }); return; }

      if (user.avatar?.includes('digitaloceanspaces.com')) {
        deleteFileByUrl(user.avatar).catch(console.error);
      }

      user.avatar = file.location;
      await user.save({ validateBeforeSave: false });

      rabbitMQ.publish('user.avatar_uploaded', {
        userId: user._id.toString(),
        avatarUrl: file.location,
      }).catch(console.error);

      res.json({ success: true, message: 'Avatar uploaded.', avatarUrl: file.location, user });
    }).catch(() => {
      res.status(500).json({ success: false, message: 'Failed to update avatar.' });
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update avatar.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/upload/cover
// ═══════════════════════════════════════════════════════════
export const uploadCover = (req: AuthRequest, res: Response): void => {
  try {
    const file = req.file as MulterS3File;
    User.findById(req.user!._id).then(async (user) => {
      if (!user) { res.status(404).json({ success: false, message: 'User not found.' }); return; }

      if (user.coverImage?.includes('digitaloceanspaces.com')) {
        deleteFileByUrl(user.coverImage).catch(console.error);
      }

      user.coverImage = file.location;
      await user.save({ validateBeforeSave: false });

      res.json({ success: true, message: 'Cover image uploaded.', coverUrl: file.location, user });
    }).catch(() => {
      res.status(500).json({ success: false, message: 'Failed to update cover image.' });
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update cover image.' });
  }
};

// ═══════════════════════════════════════════════════════════
// PATCH /api/auth/profile
// ═══════════════════════════════════════════════════════════
export const updateProfile: RequestHandler = async (req: AuthRequest, res: Response) => {
  if (handleValidation(req, res)) return;

  try {
    const { name, username, bio } = req.body as { name?: string; username?: string; bio?: string };

    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: req.user!._id } });
      if (existing) {
        res.status(409).json({ success: false, message: 'Username already taken.' });
        return;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      {
        ...(name !== undefined     && { name }),
        ...(username !== undefined && { username }),
        ...(bio !== undefined      && { bio }),
      },
      { new: true, runValidators: true }
    );

    rabbitMQ.publish('user.profile_updated', { userId: req.user!._id.toString() }).catch(console.error);

    res.json({ success: true, user });
  } catch {
    res.status(500).json({ success: false, message: 'Profile update failed.' });
  }
};
