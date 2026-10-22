import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from './errors';

export const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { fn(req, res, next).catch(next); };

export function pageParams(q: Record<string, unknown>): { page: number; limit: number; skip: number } {
  const page  = Math.max(1, parseInt(String(q.page ?? '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(q.limit ?? '20'), 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

/** Error middleware for the newer routers: AppError → its status/message; anything else → generic 500. */
export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) { next(err); return; }
  if (err instanceof AppError) {
    res.status(err.status).json({ success: false, message: err.message, ...(err.code ? { code: err.code } : {}), ...(err.extra ?? {}) });
    return;
  }
  const e = err as { code?: string; message?: string };
  if (e?.code === 'LIMIT_FILE_SIZE') { res.status(413).json({ success: false, message: 'Image is too large. The limit is 5 MB.', code: 'IMAGE_TOO_LARGE' }); return; }
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
}
