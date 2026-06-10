import { Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import User from '../models/User';
import { AuthRequest, UserRole } from '../types';

/**
 * Protect routes — requires a valid Bearer JWT
 */
export const protect: RequestHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'No token provided. Please log in.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select('-password -refreshTokens');
    if (!user) {
      res.status(401).json({ success: false, message: 'User no longer exists.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    const error = err as Error;
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Token expired. Please refresh.' });
      return;
    }
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

/**
 * Restrict access to specific roles
 */
export const restrictTo = (...roles: UserRole[]): RequestHandler => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
      return;
    }
    next();
  };
};
