import express from 'express';
import { protect, adminOnly } from '../middleware/auth';
import {
  createQuiz, getQuizzes, getQuiz, updateQuiz, deleteQuiz,
  addQuestions, removeQuestion, getQuizQuestions,
  startQuiz, endQuiz, getActiveQuizzes,
  uploadImage, removeImage,
} from '../controllers/quizController';
import { quizImageUploader } from '../config/spaces';

const router = express.Router();

// Public
router.get('/active', getActiveQuizzes);
router.get('/',       getQuizzes);
router.get('/:id',    getQuiz);

// Admin — create / manage
router.post('/',                          protect, adminOnly, createQuiz);
router.patch('/:id',                      protect, adminOnly, updateQuiz);
router.delete('/:id',                     protect, adminOnly, deleteQuiz);

// Questions on a quiz
router.get('/:id/questions',              getQuizQuestions);
router.post('/:id/questions',             protect, adminOnly, addQuestions);
router.delete('/:id/questions/:questionId', protect, adminOnly, removeQuestion);

// Lifecycle
router.post('/:id/start',                 protect, adminOnly, startQuiz);
router.post('/:id/end',                   protect, adminOnly, endQuiz);

// Image
router.post('/upload-image',              protect, adminOnly, quizImageUploader.single('image'), uploadImage);
router.post('/:id/image',                 protect, adminOnly, quizImageUploader.single('image'), updateQuiz);
router.delete('/:id/image',               protect, adminOnly, removeImage);

export default router;
