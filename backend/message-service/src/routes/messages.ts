import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import {
  listConversations, getMessages, getOrCreateConversation, sendMessage, markRead, uploadImage,
} from '../controllers/messageController';
import { messageImageUpload } from '../config/spaces';

const router = Router();
router.use(protect);

router.get('/conversations',                                   listConversations);
router.post('/conversations/:userId',                          getOrCreateConversation);
router.get('/conversations/:conversationId',                   getMessages);
router.post('/conversations/:conversationId/messages',         sendMessage);
router.post('/conversations/:conversationId/read',             markRead);

router.post('/upload', (req: AuthRequest, res: Response): void => {
  messageImageUpload.single('image')(req as never, res, (err) => {
    if (err) { res.status(400).json({ success: false, message: (err as Error).message }); return; }
    uploadImage(req, res);
  });
});

export default router;
