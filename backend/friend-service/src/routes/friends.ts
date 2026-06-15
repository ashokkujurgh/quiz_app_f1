import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  sendRequest, acceptRequest, declineRequest, unfriend, cancelRequest, blockUser,
  listFriends, incomingRequests, outgoingRequests, suggestions, friendStatus,
} from '../controllers/friendController';

const router = Router();

router.use(protect);

router.get('/',                        listFriends);
router.get('/requests/incoming',       incomingRequests);
router.get('/requests/outgoing',       outgoingRequests);
router.get('/suggestions',             suggestions);
router.get('/status/:userId',          friendStatus);

router.post('/request/:userId',        sendRequest);
router.post('/accept/:requestId',      acceptRequest);
router.post('/decline/:requestId',     declineRequest);
router.delete('/unfriend/:userId',     unfriend);
router.delete('/cancel/:userId',       cancelRequest);
router.post('/block/:userId',          blockUser);

export default router;
