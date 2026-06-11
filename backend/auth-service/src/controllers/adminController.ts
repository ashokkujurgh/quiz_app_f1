import { Response, RequestHandler } from 'express';
import User from '../models/User';
import { signAccessToken } from '../utils/jwt';
import rabbitMQ from '../config/rabbitmq';
import { AuthRequest } from '../types';

// ═══════════════════════════════════════════════════════════
// POST /api/admin/login
// ═══════════════════════════════════════════════════════════
export const adminLogin: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email, role: 'admin' }).select('+password');
    if (!user || !user.password) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    // Emit online status so admin panel reflects correctly
    try {
      const { broadcastUserStatus } = require('../config/socket');
      broadcastUserStatus(user._id.toString(), true);
    } catch {}

    const accessToken = signAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.json({ success: true, accessToken, user });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

// ═══════════════════════════════════════════════════════════
// GET /api/admin/users
// ═══════════════════════════════════════════════════════════
export const listUsers: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const page  = Math.max(1, parseInt((req.query.page  as string) ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? '20')));
    const search = (req.query.search as string) ?? '';

    // Always exclude docs with no email (corrupted records)
    const baseFilter = { email: { $exists: true, $not: { $in: [null, ''] } } };

    const filter = search
      ? {
          ...baseFilter,
          $or: [
            { name:     { $regex: search, $options: 'i' } },
            { email:    { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
          ],
        }
      : baseFilter;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-refreshTokens')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      users,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

// ═══════════════════════════════════════════════════════════
// PATCH /api/admin/users/:id/status
// Enable or disable a user
// ═══════════════════════════════════════════════════════════
export const toggleUserStatus: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent admin from disabling themselves
    if (id === req.user!._id.toString()) {
      res.status(400).json({ success: false, message: 'You cannot disable your own account.' });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    user.isActive = !user.isActive;

    // If disabling, also mark offline and clear refresh tokens
    if (!user.isActive) {
      user.isOnline = false;
      const fullUser = await User.findById(id).select('+refreshTokens');
      if (fullUser) {
        fullUser.isActive = false;
        fullUser.isOnline = false;
        fullUser.refreshTokens = [];
        await fullUser.save({ validateBeforeSave: false });

        try {
          const { broadcastUserStatus, getIO } = require('../config/socket');
          broadcastUserStatus(id, false);
          getIO().to('admins').to(`user:${id}`).emit('user:disabled', { userId: id });
        } catch {}

        res.json({ success: true, isActive: false, user: fullUser });
        return;
      }
    }

    await user.save({ validateBeforeSave: false });
    res.json({ success: true, isActive: user.isActive, user });
  } catch (err) {
    console.error('Toggle user status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/admin/users
// Create a new admin user
// ═══════════════════════════════════════════════════════════
export const createAdminUser: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password } = req.body as {
      name?: string; email?: string; password?: string;
    };

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email and password are required.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      return;
    }

    if (await User.findOne({ email })) {
      res.status(409).json({ success: false, message: 'Email already registered.' });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'admin',
      authProvider: 'email',
      isEmailVerified: true,
    });

    rabbitMQ.publish('admin.user_created', {
      userId: user._id.toString(),
      email:  user.email,
      createdBy: req.user?._id.toString(),
    }).catch(console.error);

    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error('Create admin user error:', err);
    res.status(500).json({ success: false, message: 'Failed to create admin user.' });
  }
};
