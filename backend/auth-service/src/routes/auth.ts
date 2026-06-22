import express, { Response } from 'express';
import { body } from 'express-validator';
import { createUploader } from '../config/spaces';
import { protect } from '../middleware/authMiddleware';
import { AuthRequest, MulterS3File } from '../types';
import {
  firebaseAuth,
  emailLogin,
  emailRegister,
  refreshToken,
  logout,
  getMe,
  setOnline,
  setOffline,
  uploadAvatar,
  uploadCover,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from '../controllers/authController';

const router = express.Router();

// ── Uploaders ─────────────────────────────────────────────
const avatarUpload = createUploader('avatars');
const coverUpload  = createUploader('covers');
const imageUpload  = createUploader('images');

// ── Validation rules ──────────────────────────────────────
const updateProfileRules = [
  body('name').optional().trim().isLength({ min: 2, max: 60 }),
  body('username').optional().matches(/^[a-z0-9_]+$/),
  body('bio').optional().isLength({ max: 200 }),
];

// ── Routes ────────────────────────────────────────────────
router.post('/firebase',         firebaseAuth);
router.post('/register',         emailRegister);
router.post('/login',            emailLogin);
router.post('/refresh',          refreshToken);
router.post('/logout',           protect, logout);
router.post('/forgot-password',    forgotPassword);
router.post('/reset-password',     resetPassword);
router.post('/verify-email',       verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/me',         protect, getMe);
router.post('/online',    protect, setOnline);
router.post('/offline',   protect, setOffline);

// Upload routes
router.post('/upload/avatar', protect, (req: AuthRequest, res: Response): void => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) { res.status(400).json({ success: false, message: (err as Error).message }); return; }
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded.' }); return; }
    uploadAvatar(req, res);
  });
});

router.post('/upload/cover', protect, (req: AuthRequest, res: Response): void => {
  coverUpload.single('cover')(req, res, (err) => {
    if (err) { res.status(400).json({ success: false, message: (err as Error).message }); return; }
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded.' }); return; }
    uploadCover(req, res);
  });
});

// Generic image upload — returns CDN URL, no user record update
router.post('/upload/image', protect, (req: AuthRequest, res: Response): void => {
  imageUpload.single('image')(req, res, (err) => {
    if (err) { console.error('Upload err full:', err); res.status(400).json({ success: false, message: (err as Error).message || JSON.stringify(err) }); return; }
    const file = req.file as MulterS3File | undefined;
    if (!file) { res.status(400).json({ success: false, message: 'No file uploaded.' }); return; }
    res.json({ success: true, url: file.location });
  });
});

// Multiple image upload — up to 5 images, returns array of CDN URLs
router.post('/upload/images', protect, (req: AuthRequest, res: Response): void => {
  imageUpload.array('images', 5)(req, res, (err) => {
    if (err) { res.status(400).json({ success: false, message: (err as Error).message }); return; }
    const files = (req.files ?? []) as MulterS3File[];
    if (!files.length) { res.status(400).json({ success: false, message: 'No files uploaded.' }); return; }
    res.json({ success: true, urls: files.map((f) => f.location) });
  });
});

router.patch('/profile', protect, updateProfileRules, updateProfile);

// ── Block / Unblock ───────────────────────────────────────
import User from '../models/User';
import mongoose from 'mongoose';

router.post('/block/:userId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user!;
  const targetId = req.params.userId;
  if (!mongoose.isValidObjectId(targetId)) { res.status(400).json({ success: false, message: 'Invalid user id' }); return; }
  if (String(me._id) === targetId) { res.status(400).json({ success: false, message: 'Cannot block yourself' }); return; }
  await User.findByIdAndUpdate(me._id, { $addToSet: { blockedUsers: new mongoose.Types.ObjectId(targetId) } });
  res.json({ success: true });
});

router.delete('/block/:userId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user!;
  const targetId = req.params.userId;
  if (!mongoose.isValidObjectId(targetId)) { res.status(400).json({ success: false, message: 'Invalid user id' }); return; }
  await User.findByIdAndUpdate(me._id, { $pull: { blockedUsers: new mongoose.Types.ObjectId(targetId) } });
  res.json({ success: true });
});

router.get('/blocked', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = await User.findById(req.user!._id).select('blockedUsers').lean();
  const ids = (me?.blockedUsers ?? []).map(String);
  res.json({ success: true, blockedUsers: ids });
});

// Specific route BEFORE the :userId param route
router.post('/users/bulk', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ids: string[] = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (!ids.length) { res.json({ success: true, users: [] }); return; }
    const users = await User.find({ _id: { $in: ids } }).select('_id name username avatar').lean();
    res.json({ success: true, users });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

router.get('/users/search', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  const q = ((req.query.q as string) ?? '').trim();
  if (!q || q.length < 2) { res.json({ success: true, users: [] }); return; }
  const filter = {
    _id:      { $ne: req.user!._id },
    isActive: { $ne: false },
    $or: [
      { name:     { $regex: q, $options: 'i' } },
      { email:    { $regex: q, $options: 'i' } },
      { username: { $regex: q, $options: 'i' } },
    ],
  };
  const users = await User.find(filter).select('_id name email username avatar').limit(20).lean();
  res.json({ success: true, users });
});

router.get('/users/:userId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId).select('_id name email username avatar coverImage role').lean();
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, user });
  } catch {
    res.status(400).json({ success: false, message: 'Invalid user ID' });
  }
});

export default router;
