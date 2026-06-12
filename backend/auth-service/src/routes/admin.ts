import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware';
import { adminLogin, getMe, listUsers, createAdminUser, toggleUserStatus } from '../controllers/adminController';

const router = express.Router();

router.post('/login',  adminLogin);
router.get('/me',                   protect, restrictTo('admin'), getMe);
router.get('/users',                protect, restrictTo('admin'), listUsers);
router.post('/users',               protect, restrictTo('admin'), createAdminUser);
router.patch('/users/:id/status',   protect, restrictTo('admin'), toggleUserStatus);

export default router;
