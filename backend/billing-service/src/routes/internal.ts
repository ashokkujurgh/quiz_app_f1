import express from 'express';
import { requireInternal } from '../middleware/auth';
import { ah } from '../utils/http';
import { internalEntitlements } from '../controllers/internalController';
import * as q from '../controllers/quotaController';
import { internalCreatorStatus } from '../controllers/creatorController';
import { internalRecordView, internalPostStats } from '../controllers/earningsController';

// Service-to-service only. Not proxied by nginx; protected by INTERNAL_SERVICE_SECRET.
const router = express.Router();
router.use(requireInternal);
router.get('/entitlements/:userId', ah(internalEntitlements));
router.get('/quota/:userId/eligibility', ah(q.internalEligibility));
router.get('/creators/:userId',          ah(internalCreatorStatus));
router.post('/views/record',             ah(internalRecordView));
router.post('/earnings/posts',           ah(internalPostStats));
router.post('/quota/reserve',     ah(q.internalReserve));
router.post('/quota/consume',     ah(q.internalConsume));
router.post('/quota/release',     ah(q.internalRelease));
router.post('/quota/release-ref', ah(q.internalReleaseByRef));

export default router;
