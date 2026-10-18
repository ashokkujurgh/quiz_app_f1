import express from 'express';
import { protect, adminOnly } from '../middleware/auth';
import {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getStats,
  getPendingQuestions,
} from '../controllers/questionController';

const router = express.Router();

router.get('/stats',  protect, adminOnly, getStats);
router.get('/pending', protect, adminOnly, getPendingQuestions); // before '/:id'
router.get('/',       getQuestions);
router.get('/:id',    getQuestion);
router.post('/',      protect, adminOnly, createQuestion);
router.patch('/:id',  protect, adminOnly, updateQuestion);
router.delete('/:id', protect, adminOnly, deleteQuestion);

export default router;
