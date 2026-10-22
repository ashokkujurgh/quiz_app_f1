import { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const protect: RequestHandler = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided.' });
    return;
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      issuer: 'meenzo-auth',
    }) as { id: string; email: string; role: string };
    if (!Types.ObjectId.isValid(decoded.id)) throw new Error('bad id');
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Role check against the database, not the JWT — a role an admin revokes stops working
 * immediately instead of when the 7-day token expires. Also rejects deactivated accounts.
 */
export const requireRole = (...roles: string[]): RequestHandler =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findById(req.user!.id).select('role isActive').lean();
      if (!user || user.isActive === false || !roles.includes(user.role)) {
        res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
        return;
      }
      req.user!.role = user.role;
      next();
    } catch (err) {
      next(err);
    }
  };

/** Service-to-service calls. Refuses everything when the secret is not configured (no default). */
export const requireInternal: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const secret = process.env.INTERNAL_SERVICE_SECRET;
  if (!secret) {
    res.status(503).json({ success: false, message: 'Internal API is not configured.' });
    return;
  }
  const given = Buffer.from(String(req.headers['x-internal-secret'] ?? ''));
  const want  = Buffer.from(secret);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  next();
};
