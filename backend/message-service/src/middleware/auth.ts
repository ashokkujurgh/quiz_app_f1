import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';

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
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

export function authenticateSocket(socket: Socket, next: (err?: Error) => void): void {
  const token = (socket.handshake.auth?.token as string) ?? (socket.handshake.headers?.authorization as string)?.split(' ')[1];
  if (!token) { next(new Error('No token')); return; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string, { issuer: 'meenzo-auth' }) as {
      id: string; username: string; email: string;
    };
    (socket as Socket & { user?: unknown }).user = decoded;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}
