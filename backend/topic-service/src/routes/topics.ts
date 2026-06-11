import express from 'express';
import { protect, adminOnly } from '../middleware/auth';
import {
  getTopics, getTopic, createTopic, updateTopic, deleteTopic,
  getSubTopics, createSubTopic, updateSubTopic, deleteSubTopic,
} from '../controllers/topicController';

const router = express.Router();

// ── Topics ────────────────────────────────────────────────
router.get('/',           getTopics);
router.get('/:id',        getTopic);
router.post('/',          protect, adminOnly, createTopic);
router.patch('/:id',      protect, adminOnly, updateTopic);
router.delete('/:id',     protect, adminOnly, deleteTopic);

// ── SubTopics ─────────────────────────────────────────────
router.get('/:id/subtopics',    getSubTopics);
router.post('/:id/subtopics',   protect, adminOnly, createSubTopic);

// ── SubTopic direct (no topicId in URL) ───────────────────
router.patch('/subtopics/:id',  protect, adminOnly, updateSubTopic);
router.delete('/subtopics/:id', protect, adminOnly, deleteSubTopic);

export default router;
