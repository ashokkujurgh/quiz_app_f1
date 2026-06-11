import crypto from 'crypto';
import { Response, RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import { createTokenPair, verifyRefreshToken } from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
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

  // Store refresh token (re-fetch with select so array is writable)
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
// POST /api/auth/register
// ═══════════════════════════════════════════════════════════
export const register: RequestHandler = async (req: AuthRequest, res: Response) => {
  if (handleValidation(req, res)) return;

  try {
    const { name, email, password, username } = req.body as {
      name: string; email: string; password: string; username?: string;
    };

    if (await User.findOne({ email })) {
      res.status(409).json({ success: false, message: 'Email already registered.' });
      return;
    }
    if (username && (await User.findOne({ username }))) {
      res.status(409).json({ success: false, message: 'Username already taken.' });
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      name, email, password, username,
      authProvider: 'email',
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Non-blocking side-effects
    sendVerificationEmail(user, verificationToken).catch(console.error);
    rabbitMQ.publish('user.registered', {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      authProvider: 'email',
    }).catch(console.error);

    await sendAuthResponse(res, req, user, 201);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/login
// ═══════════════════════════════════════════════════════════
export const login: RequestHandler = async (req: AuthRequest, res: Response) => {
  if (handleValidation(req, res)) return;

  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user?.password || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    user.isOnline = true;
    user.lastSeen = new Date();

    rabbitMQ.publish('user.logged_in', {
      userId: user._id.toString(),
      email: user.email,
    }).catch(console.error);

    await sendAuthResponse(res, req, user);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/google/firebase
// ═══════════════════════════════════════════════════════════
export const googleFirebase: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) {
      res.status(400).json({ success: false, message: 'Firebase ID token is required.' });
      return;
    }

    const firebaseAuth = getFirebaseAuth();
    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const { uid, email, name, picture, email_verified } = decoded;

    if (!email) {
      res.status(400).json({ success: false, message: 'No email associated with this Google account.' });
      return;
    }

    let user = (await User.findOne({ $or: [{ firebaseUid: uid }, { email }] }).select('+refreshTokens')) as IUser | null;
    const isNewUser = !user;

    if (user) {
      if (!user.firebaseUid) user.firebaseUid = uid;
      if (picture && !user.avatar) user.avatar = picture;
      user.isOnline = true;
      user.lastSeen = new Date();
      user.isEmailVerified = email_verified ?? user.isEmailVerified;
      await user.save({ validateBeforeSave: false });
    } else {
      const created = await User.create({
        name: name ?? email.split('@')[0],
        email,
        firebaseUid: uid,
        googleId: uid,
        avatar: picture ?? null,
        authProvider: 'google',
        isEmailVerified: email_verified ?? false,
        isOnline: true,
      });
      user = (await User.findById(created._id).select('+refreshTokens')) as IUser | null;
    }

    if (!user) {
      res.status(500).json({ success: false, message: 'Failed to create user.' });
      return;
    }

    rabbitMQ.publish(isNewUser ? 'user.registered' : 'user.google_oauth', {
      userId: user._id.toString(),
      email: user.email,
      authProvider: 'google',
    }).catch(console.error);

    await sendAuthResponse(res, req, user as IUser);
  } catch (err) {
    const error = err as { code?: string; message?: string };
    console.error('Firebase Google auth error:', error);
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({ success: false, message: 'Google token expired. Please sign in again.' });
      return;
    }
    res.status(401).json({ success: false, message: 'Google authentication failed.' });
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

    // Rotate
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
// GET /api/auth/verify-email
// ═══════════════════════════════════════════════════════════
export const verifyEmail: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.query as { token?: string };
    if (!token) {
      res.status(400).json({ success: false, message: 'Verification token is required.' });
      return;
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400).json({ success: false, message: 'Token invalid or expired.' });
      return;
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    rabbitMQ.publish('user.email_verified', {
      userId: user._id.toString(),
      email: user.email,
    }).catch(console.error);

    res.json({ success: true, message: 'Email verified successfully.' });
  } catch {
    res.status(500).json({ success: false, message: 'Email verification failed.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// ═══════════════════════════════════════════════════════════
export const forgotPassword: RequestHandler = async (req: AuthRequest, res: Response) => {
  if (handleValidation(req, res)) return;

  try {
    const { email } = req.body as { email: string };
    const user = await User.findOne({ email });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save({ validateBeforeSave: false });

      sendPasswordResetEmail(user, resetToken).catch(console.error);
      rabbitMQ.publish('user.password_reset_requested', {
        userId: user._id.toString(),
        email: user.email,
      }).catch(console.error);
    }

    // Always return success (prevents email enumeration)
    res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to process request.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// ═══════════════════════════════════════════════════════════
export const resetPassword: RequestHandler = async (req: AuthRequest, res: Response) => {
  if (handleValidation(req, res)) return;

  try {
    const { token, password } = req.body as { token: string; password: string };
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+refreshTokens');

    if (!user) {
      res.status(400).json({ success: false, message: 'Reset token invalid or expired.' });
      return;
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = [];
    await user.save();

    rabbitMQ.publish('user.password_reset', { userId: user._id.toString() }).catch(console.error);

    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch {
    res.status(500).json({ success: false, message: 'Password reset failed.' });
  }
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
