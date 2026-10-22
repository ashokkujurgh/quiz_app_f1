import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from './errors';

/** Wrap an async handler so thrown errors reach the error middleware. */
export const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { fn(req, res, next).catch(next); };

export function pageParams(q: Record<string, unknown>): { page: number; limit: number; skip: number } {
  const page  = Math.max(1, parseInt(String(q.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(q.limit ?? '20'), 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ success: false, message: err.message, ...(err.code ? { code: err.code } : {}), ...(err.extra ?? {}) });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
}
