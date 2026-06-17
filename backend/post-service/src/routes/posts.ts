import express, { Request, Response } from 'express';
import { protect, optionalAuth } from '../middleware/auth';
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleSave,
  getComments,
  addComment,
  deleteComment,
  toggleCommentLike,
  getUserPosts,
  createInternalPost,
} from '../controllers/postController';

const router = express.Router();

// ── Internal service-to-service (no user auth, shared secret) ────────────────
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET ?? 'internal-quiz-secret';
router.post('/internal', (req: Request, res: Response, next: express.NextFunction) => {
  if (req.headers['x-internal-secret'] !== INTERNAL_SECRET) {
    res.status(403).json({ success: false, message: 'Forbidden' }); return;
  }
  next();
}, createInternalPost);

// ── Feed ──────────────────────────────────────────────────────────────────────
router.get('/',                                           optionalAuth, getPosts);
router.get('/user/:userId',                               optionalAuth, getUserPosts);
router.get('/:id',                                        optionalAuth, getPost);
router.post('/',                                          protect,      createPost);
router.patch('/:id',                                      protect,      updatePost);
router.delete('/:id',                                     protect,      deletePost);

// ── Reactions ─────────────────────────────────────────────────────────────────
router.post('/:id/like',                                  protect,      toggleLike);
router.post('/:id/save',                                  protect,      toggleSave);

// ── Comments ──────────────────────────────────────────────────────────────────
router.get('/:id/comments',                               optionalAuth, getComments);
router.post('/:id/comments',                              protect,      addComment);
router.delete('/:id/comments/:commentId',                 protect,      deleteComment);
router.post('/:id/comments/:commentId/like',              protect,      toggleCommentLike);

export default router;
