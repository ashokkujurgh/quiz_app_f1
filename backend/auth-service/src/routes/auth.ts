import express, { Response } from 'express';
import { body } from 'express-validator';
import { createUploader } from '../config/spaces';
import { protect } from '../middleware/authMiddleware';
import { AuthRequest, MulterS3File } from '../types';
import {
  register,
  login,
  googleFirebase,
  refreshToken,
  logout,
  getMe,
  verifyEmail,
  forgotPassword,
  resetPassword,
  uploadAvatar,
  uploadCover,
  updateProfile,
} from '../controllers/authController';

const router = express.Router();

// ── Uploaders ─────────────────────────────────────────────
const avatarUpload = createUploader('avatars');
const coverUpload  = createUploader('covers');

// ── Validation rules ──────────────────────────────────────
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 60 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('username')
    .optional()
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Username can only contain lowercase letters, numbers and underscores'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPasswordRules = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const updateProfileRules = [
  body('name').optional().trim().isLength({ min: 2, max: 60 }),
  body('username').optional().matches(/^[a-z0-9_]+$/),
  body('bio').optional().isLength({ max: 200 }),
];

// ── Routes ────────────────────────────────────────────────
router.post('/register',         registerRules,       register);
router.post('/login',            loginRules,          login);
router.post('/google/firebase',                       googleFirebase);
router.post('/refresh',                               refreshToken);
router.post('/logout',           protect,             logout);
router.get('/me',                protect,             getMe);
router.get('/verify-email',                           verifyEmail);
router.post('/forgot-password',  forgotPasswordRules, forgotPassword);
router.post('/reset-password',   resetPasswordRules,  resetPassword);

// Upload routes (multer wraps the controller inline)
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

router.patch('/profile', protect, updateProfileRules, updateProfile);

export default router;
