import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; username: string; email: string };
}

export function protect(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string, { issuer: 'meenzo-auth' }) as {
      id: string; username: string; email: string;
    };
    req.user = { id: decoded.id, username: decoded.username, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}
