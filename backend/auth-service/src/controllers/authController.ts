import { Response, RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import User from '../models/User';
import { createTokenPair, verifyRefreshToken } from '../utils/jwt';
import { getFirebaseAuth } from '../config/firebase';
import { deleteFileByUrl } from '../config/spaces';
import rabbitMQ from '../config/rabbitmq';
import { sendVerificationEmail, sendPasswordResetEmail } from '../config/mailer';
import { AuthRequest, IUser, MulterS3File } from '../types';

const emitUserStatus = (userId: string, isOnline: boolean) => {
  try {
    const { broadcastUserStatus } = require('../config/socket');
    broadcastUserStatus(userId, isOnline);
    console.log(`[status] emitted ${isOnline ? 'online' : 'offline'} for user ${userId}`);
  } catch (err) {
    console.warn('[status] broadcastUserStatus failed:', (err as Error).message);
  }
};

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
// POST /api/auth/register  — email + password registration
// ═══════════════════════════════════════════════════════════
export const emailRegister: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password } = req.body as {
      name?: string; email?: string; password?: string;
    };

    if (!name?.trim() || !email?.trim() || !password) {
      res.status(400).json({ success: false, message: 'name, email and password are required.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      return;
    }

    const exists = await User.findOne({ email });
    if (exists) {
      res.status(409).json({ success: false, message: 'Email is already registered.' });
      return;
    }

    const user = await User.create({
      name:            name.trim(),
      email:           email.trim().toLowerCase(),
      password,
      role:            'user',
      isEmailVerified: false,
    });

    // Issue verification token and send email
    try {
      const rawToken   = crypto.randomBytes(32).toString('hex');
      const hashed     = crypto.createHash('sha256').update(rawToken).digest('hex');
      (user as any).emailVerifyToken   = hashed;
      (user as any).emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await (user as any).save({ validateBeforeSave: false });

      const verifyUrl = `${process.env.FRONTEND_URL ?? 'https://meenzo.com'}/verify-email?token=${rawToken}`;
      await sendVerificationEmail(user.email, verifyUrl);
    } catch (mailErr) {
      console.error('Verification email error:', mailErr);
    }

    rabbitMQ.publish('user.registered', { userId: user._id.toString(), email: user.email }).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email and verify your account before logging in.',
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed.' });
  }
};

// POST /api/auth/login  — email + password (quizapp users)
// ═══════════════════════════════════════════════════════════
export const emailLogin: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !user.password) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }
    if (!(await user.comparePassword(password))) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }
    if (user.isActive === false) {
      res.status(403).json({ success: false, message: 'Account disabled. Contact support.' });
      return;
    }
    if (!user.isEmailVerified) {
      res.status(403).json({ success: false, message: 'EMAIL_NOT_VERIFIED' });
      return;
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    emitUserStatus(user._id.toString(), true);

    rabbitMQ.publish('user.logged_in', { userId: user._id.toString(), email: user.email }).catch(console.error);

    await sendAuthResponse(res, req, user);
  } catch (err) {
    console.error('Email login error:', err);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/firebase
// Accepts a Firebase ID token from either email/password or
// Google OAuth sign-in. The client always sends the same shape.
// ═══════════════════════════════════════════════════════════
export const firebaseAuth: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { idToken, name: bodyName } = req.body as { idToken?: string; name?: string };
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
      emitUserStatus(user._id.toString(), true);
    } else {
      const created = await User.create({
        name:     bodyName ?? name ?? email.split('@')[0],
        email,
        firebaseUid: uid,
        googleId: provider === 'google' ? uid : undefined,
        avatar: picture ?? null,
        authProvider: provider,
        isEmailVerified: email_verified ?? false,
        isOnline: true,
      });
      user = (await User.findById(created._id).select('+refreshTokens')) as IUser | null;
      if (user) emitUserStatus(user._id.toString(), true);
    }

    if (!user) {
      res.status(500).json({ success: false, message: 'Failed to create user.' });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({ success: false, message: 'Your account has been disabled. Please contact support.' });
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
      emitUserStatus(user._id.toString(), false);
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
// POST /api/auth/online   — called on page load / app resume
// POST /api/auth/offline  — called on page unload (keepalive)
// ═══════════════════════════════════════════════════════════
export const setOnline: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    emitUserStatus(userId, true);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
};

export const setOffline: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
    emitUserStatus(userId, false);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
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

// ── Email Verification ────────────────────────────────────────────────────────
export const verifyEmail: RequestHandler = async (req, res): Promise<void> => {
  const { token } = req.body as { token?: string };
  if (!token) { res.status(400).json({ success: false, message: 'Token is required.' }); return; }

  try {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user   = await User.findOne({
      emailVerifyToken:   hashed,
      emailVerifyExpires: { $gt: new Date() },
    });

    if (!user) { res.status(400).json({ success: false, message: 'Verification link is invalid or has expired.' }); return; }

    user.isEmailVerified        = true;
    (user as any).emailVerifyToken   = null;
    (user as any).emailVerifyExpires = null;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Email verified! You can now log in.' });
  } catch (err) {
    console.error('verifyEmail error:', err);
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
};

export const resendVerification: RequestHandler = async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ success: false, message: 'Email is required.' }); return; }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.isEmailVerified) {
      res.json({ success: true, message: 'If that email exists and is unverified, a new link has been sent.' });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    (user as any).emailVerifyToken   = crypto.createHash('sha256').update(rawToken).digest('hex');
    (user as any).emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await (user as any).save({ validateBeforeSave: false });

    const verifyUrl = `${process.env.FRONTEND_URL ?? 'https://meenzo.com'}/verify-email?token=${rawToken}`;
    await sendVerificationEmail(user.email, verifyUrl);

    res.json({ success: true, message: 'If that email exists and is unverified, a new link has been sent.' });
  } catch (err) {
    console.error('resendVerification error:', err);
    res.status(500).json({ success: false, message: 'Failed to resend. Please try again.' });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────
export const forgotPassword: RequestHandler = async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ success: false, message: 'Email is required.' }); return; }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return 200 to avoid email enumeration
    if (!user) { res.json({ success: true, message: 'If that email is registered you will receive a reset link.' }); return; }

    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken   = crypto.createHash('sha256').update(token).digest('hex');
    user.passwordResetExpires = expires;
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL ?? 'https://meenzo.com'}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    res.json({ success: true, message: 'If that email is registered you will receive a reset link.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    res.status(500).json({ success: false, message: 'Failed to send reset email. Please try again.' });
  }
};

export const resetPassword: RequestHandler = async (req, res): Promise<void> => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) { res.status(400).json({ success: false, message: 'Token and new password are required.' }); return; }
  if (password.length < 6) { res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' }); return; }

  try {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user   = await User.findOne({
      passwordResetToken:   hashed,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) { res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' }); return; }

    user.password             = password;
    user.passwordResetToken   = null as any;
    user.passwordResetExpires = null as any;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ success: false, message: 'Password reset failed. Please try again.' });
  }
};
