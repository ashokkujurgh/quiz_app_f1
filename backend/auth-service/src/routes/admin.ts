import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware';
import { adminLogin, getMe, listUsers, createAdminUser, toggleUserStatus, listReviewers, setReviewerRole, roleHistory } from '../controllers/adminController';

const router = express.Router();

router.post('/login',  adminLogin);
router.get('/me',                   protect, restrictTo('admin'), getMe);
router.get('/users',                protect, restrictTo('admin'), listUsers);
router.post('/users',               protect, restrictTo('admin'), createAdminUser);
router.patch('/users/:id/status',   protect, restrictTo('admin'), toggleUserStatus);
router.get('/reviewers',            protect, restrictTo('admin'), listReviewers);
router.post('/users/:id/reviewer',  protect, restrictTo('admin'), setReviewerRole);
router.get('/users/:id/role-history', protect, restrictTo('admin'), roleHistory);

export default router;
