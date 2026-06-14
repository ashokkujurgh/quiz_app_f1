import express from 'express';
import { protect, adminOnly } from '../middleware/auth';
import {
  createQuiz, getQuizzes, getQuiz, updateQuiz, deleteQuiz,
  addQuestions, removeQuestion, getQuizQuestions,
  startQuiz, endQuiz, getActiveQuizzes,
  uploadImage, removeImage, getLeaderboard,
  getMyHistory, getGameHistory,
  getInvitedQuizzes, getMyQuizzes,
} from '../controllers/quizController';
import { quizImageUploader } from '../config/spaces';

const router = express.Router();

// Public / user-specific (static routes MUST come before /:id)
router.get('/active',       getActiveQuizzes);
router.get('/my/history',   protect, getMyHistory);
router.get('/my/quizzes',   protect, getMyQuizzes);
router.get('/my/invited',   protect, getInvitedQuizzes);
router.get('/',             getQuizzes);
router.get('/:id',          getQuiz);

// Create quiz — any authenticated user
router.post('/',                          protect, createQuiz);
router.patch('/:id',                      protect, adminOnly, updateQuiz);
router.delete('/:id',                     protect, adminOnly, deleteQuiz);

// Questions on a quiz
router.get('/:id/questions',              getQuizQuestions);
router.post('/:id/questions',             protect, adminOnly, addQuestions);
router.delete('/:id/questions/:questionId', protect, adminOnly, removeQuestion);

// Lifecycle
router.post('/:id/start',                 protect, adminOnly, startQuiz);
router.post('/:id/end',                   protect, adminOnly, endQuiz);

// Leaderboard & history
router.get('/:id/leaderboard',   getLeaderboard);
router.get('/:id/my-history',    protect, getGameHistory);

// Image
router.post('/upload-image',              protect, adminOnly, quizImageUploader.single('image'), uploadImage);
router.post('/:id/image',                 protect, adminOnly, quizImageUploader.single('image'), updateQuiz);
router.delete('/:id/image',               protect, adminOnly, removeImage);

export default router;
