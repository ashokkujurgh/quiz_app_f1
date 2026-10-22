import { Request, Response } from 'express';
import { getEntitlements } from '../services/entitlements';

// GET /internal/entitlements/:userId  (service-to-service)
export async function internalEntitlements(req: Request, res: Response) {
  res.json({ success: true, entitlements: await getEntitlements(req.params.userId) });
}
