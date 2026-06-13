import express, { Response } from 'express';
import { body } from 'express-validator';
import { createUploader } from '../config/spaces';
import { protect } from '../middleware/authMiddleware';
import { AuthRequest, MulterS3File } from '../types';
import {
  firebaseAuth,
  emailLogin,
  refreshToken,
  logout,
  getMe,
  setOnline,
  setOffline,
  uploadAvatar,
  uploadCover,
  updateProfile,
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
router.post('/firebase',  firebaseAuth);
router.post('/login',     emailLogin);
router.post('/refresh',   refreshToken);
router.post('/logout',    protect, logout);
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

router.patch('/profile', protect, updateProfileRules, updateProfile);

export default router;
