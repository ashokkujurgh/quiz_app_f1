import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware';
import { adminLogin, listUsers, createAdminUser } from '../controllers/adminController';

const router = express.Router();

router.post('/login',  adminLogin);
router.get('/users',   protect, restrictTo('admin'), listUsers);
router.post('/users',  protect, restrictTo('admin'), createAdminUser);

export default router;
