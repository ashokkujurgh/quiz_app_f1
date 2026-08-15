import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import {
  listConversations, getMessages, getOrCreateConversation, sendMessage, markRead, uploadImage,
} from '../controllers/messageController';
import {
  createGroup, getGroupDetails, updateGroup, updateGroupIcon, addGroupMembers,
  removeGroupMember, leaveGroup, makeGroupAdmin, removeGroupAdmin, deleteGroup,
} from '../controllers/groupController';
import { messageImageUpload } from '../config/spaces';

const router = Router();
router.use(protect);

router.get('/conversations',                                   listConversations);
router.post('/conversations/:userId',                          getOrCreateConversation);
router.get('/conversations/:conversationId',                   getMessages);
router.post('/conversations/:conversationId/messages',         sendMessage);
router.post('/conversations/:conversationId/read',             markRead);

// ── Group conversations ──────────────────────────────────────
router.post('/groups',                             createGroup);
router.get('/groups/:id',                           getGroupDetails);
router.patch('/groups/:id',                         updateGroup);
router.post('/groups/:id/members',                  addGroupMembers);
router.delete('/groups/:id/members/:userId',        removeGroupMember);
router.post('/groups/:id/leave',                    leaveGroup);
router.post('/groups/:id/admins/:userId',           makeGroupAdmin);
router.delete('/groups/:id/admins/:userId',         removeGroupAdmin);
router.delete('/groups/:id',                        deleteGroup);

router.post('/groups/:id/icon', (req: AuthRequest, res: Response): void => {
  messageImageUpload.single('icon')(req as never, res, (err) => {
    if (err) { res.status(400).json({ success: false, message: (err as Error).message }); return; }
    updateGroupIcon(req, res);
  });
});

router.post('/upload', (req: AuthRequest, res: Response): void => {
  messageImageUpload.single('image')(req as never, res, (err) => {
    if (err) { res.status(400).json({ success: false, message: (err as Error).message }); return; }
    uploadImage(req, res);
  });
});

export default router;
