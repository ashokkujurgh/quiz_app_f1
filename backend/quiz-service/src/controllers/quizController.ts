import { Response, RequestHandler } from 'express';
import axios from 'axios';
import { Types } from 'mongoose';
import Quiz from '../models/Quiz';
import { AuthRequest } from '../middleware/auth';
import { scheduleQuiz, cancelQuiz } from '../jobs/scheduler';
import { deleteImageByUrl } from '../config/spaces';

const QUESTION_URL = process.env.QUESTION_SERVICE_URL ?? 'http://localhost:4003';

// ── helpers ───────────────────────────────────────────────────────────────────

async function fetchRandomQuestions(
  topicId: string,
  subTopicId: string | null,
  count: number,
): Promise<string[]> {
  const params: Record<string, string | number> = { topic: topicId, limit: 200 };
  if (subTopicId) params.subTopic = subTopicId;

  const { data } = await axios.get(`${QUESTION_URL}/api/questions`, { params });
  const questions: { _id: string }[] = data.questions ?? [];
  if (questions.length < count) {
    throw new Error(
      `Not enough questions available for this topic (need ${count}, found ${questions.length}). Please reduce the question count or generate more questions first.`,
    );
  }
  return questions.sort(() => Math.random() - 0.5).slice(0, count).map((q) => q._id);
}

// ── CREATE ────────────────────────────────────────────────────────────────────

export const createQuiz: RequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title, description,
      questionCount, selectionMode,
      topic, subTopic,
      timezone, scheduledAt, durationMinutes, timeLimitPerQuestion,
      scheduleType,
      participation, allowedUsers,
    } = req.body as {
      title: string; description?: string;
      questionCount: number; selectionMode?: 'manual' | 'random';
      topic?: string; subTopic?: string;
      timezone?: string; scheduledAt: string; durationMinutes?: number; timeLimitPerQuestion?: number | null;
      scheduleType?: 'once' | 'weekly' | 'monthly';
      participation?: 'public' | 'private' | 'invite_only';
      allowedUsers?: string[];
    };

    if (!title?.trim())  { res.status(400).json({ success: false, message: 'title is required.' }); return; }
    if (!questionCount)  { res.status(400).json({ success: false, message: 'questionCount is required.' }); return; }
    if (!scheduledAt)    { res.status(400).json({ success: false, message: 'scheduledAt is required.' }); return; }

    const mode = selectionMode ?? 'random';
    let questionIds: string[] = [];

    if (mode === 'random') {
      if (!topic) { res.status(400).json({ success: false, message: 'topic is required for random selection.' }); return; }
      questionIds = await fetchRandomQuestions(topic, subTopic ?? null, questionCount);
    }

    const image = // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).file?.location ?? null;

    const quiz = await Quiz.create({
      title:           title.trim(),
      description:     description?.trim() ?? '',
      image,
      questionCount,
      selectionMode:   mode,
      questions:       questionIds.map((id) => new Types.ObjectId(id)),
      topic:           topic    ? new Types.ObjectId(topic)    : null,
      subTopic:        subTopic ? new Types.ObjectId(subTopic) : null,
      timezone:        timezone ?? 'Asia/Kolkata',
      scheduledAt:     new Date(scheduledAt),
      durationMinutes:      durationMinutes ?? 30,
      timeLimitPerQuestion: timeLimitPerQuestion ?? null,
      scheduleType:    scheduleType ?? 'once',
      participation:   participation ?? 'public',
      allowedUsers:    (allowedUsers ?? []).map((id) => new Types.ObjectId(id)),
      status:          mode === 'manual' ? 'draft' : 'scheduled',
      createdBy:       new Types.ObjectId(req.user!.id),
    });

    if (quiz.status === 'scheduled') scheduleQuiz(quiz);

    res.status(201).json({ success: true, quiz });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create quiz.';
    console.error(err);
    res.status(500).json({ success: false, message: msg });
  }
};

// ── LIST ──────────────────────────────────────────────────────────────────────

export const getQuizzes: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { status, participation } = req.query as { status?: string; participation?: string };
    const filter: Record<string, unknown> = {};
    if (status)        filter.status        = status;
    if (participation) filter.participation = participation;

    const quizzes = await Quiz.find(filter).sort({ scheduledAt: 1 }).lean();
    res.json({ success: true, quizzes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch quizzes.' });
  }
};

// ── GET ONE ───────────────────────────────────────────────────────────────────

export const getQuiz: RequestHandler = async (req, res): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id).lean();
    if (!quiz) { res.status(404).json({ success: false, message: 'Quiz not found.' }); return; }
    res.json({ success: true, quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch quiz.' });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────

export const updateQuiz: RequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) { res.status(404).json({ success: false, message: 'Quiz not found.' }); return; }
    if (quiz.status === 'active' || quiz.status === 'completed') {
      res.status(400).json({ success: false, message: `Cannot edit a quiz that is ${quiz.status}.` });
      return;
    }

    const editable = [
      'title', 'description', 'questionCount', 'timezone',
      'scheduledAt', 'durationMinutes', 'timeLimitPerQuestion', 'scheduleType', 'endDate',
      'participation', 'allowedUsers', 'status', 'image',
    ] as const;

    // If a new image was uploaded, delete the old one from Spaces
    const newImage = // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).file?.location;
    if (newImage) {
      if (quiz.image) await deleteImageByUrl(quiz.image);
      quiz.image = newImage;
    }

    for (const key of editable) {
      if (req.body[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (quiz as any)[key] = req.body[key];
      }
    }

    await quiz.save();

    cancelQuiz(quiz.id as string);
    if (quiz.status === 'scheduled') scheduleQuiz(quiz);

    res.json({ success: true, quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update quiz.' });
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────

export const deleteQuiz: RequestHandler = async (req, res): Promise<void> => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) { res.status(404).json({ success: false, message: 'Quiz not found.' }); return; }
    cancelQuiz(req.params.id);
    res.json({ success: true, message: 'Quiz deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete quiz.' });
  }
};

// ── ADD QUESTIONS (manual mode) ───────────────────────────────────────────────

export const addQuestions: RequestHandler = async (req, res): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) { res.status(404).json({ success: false, message: 'Quiz not found.' }); return; }
    if (quiz.selectionMode !== 'manual') {
      res.status(400).json({ success: false, message: 'Quiz is not in manual selection mode.' });
      return;
    }
    if (quiz.questions.length >= quiz.questionCount) {
      res.status(400).json({ success: false, message: `Quiz already has ${quiz.questionCount} question(s).` });
      return;
    }

    const { questionIds } = req.body as { questionIds: string[] };
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      res.status(400).json({ success: false, message: 'questionIds array is required.' });
      return;
    }

    const existing = new Set(quiz.questions.map((id) => id.toString()));
    const remaining = quiz.questionCount - quiz.questions.length;
    const toAdd = questionIds
      .filter((id) => !existing.has(id))
      .slice(0, remaining)
      .map((id) => new Types.ObjectId(id));

    quiz.questions.push(...toAdd);

    if (quiz.questions.length >= quiz.questionCount) {
      quiz.status = 'scheduled';
      scheduleQuiz(quiz);
    }

    await quiz.save();
    res.json({ success: true, quiz, remaining: quiz.questionCount - quiz.questions.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add questions.' });
  }
};

// ── REMOVE QUESTION ───────────────────────────────────────────────────────────

export const removeQuestion: RequestHandler = async (req, res): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) { res.status(404).json({ success: false, message: 'Quiz not found.' }); return; }

    const before = quiz.questions.length;
    quiz.questions = quiz.questions.filter(
      (qId) => qId.toString() !== req.params.questionId,
    ) as typeof quiz.questions;

    if (quiz.questions.length < before && quiz.status === 'scheduled') {
      quiz.status = 'draft';
      cancelQuiz(req.params.id);
    }

    await quiz.save();
    res.json({ success: true, quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to remove question.' });
  }
};

// ── GET QUIZ QUESTIONS ────────────────────────────────────────────────────────

export const getQuizQuestions: RequestHandler = async (req, res): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id).lean();
    if (!quiz) { res.status(404).json({ success: false, message: 'Quiz not found.' }); return; }

    if (quiz.questions.length === 0) { res.json({ success: true, questions: [] }); return; }

    const ids = quiz.questions.map((id) => id.toString()).join(',');
    const { data } = await axios.get(`${QUESTION_URL}/api/questions`, { params: { ids } });
    res.json({ success: true, questions: data.questions ?? [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch quiz questions.' });
  }
};

// ── MANUAL START / END ────────────────────────────────────────────────────────

export const startQuiz: RequestHandler = async (req, res): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) { res.status(404).json({ success: false, message: 'Quiz not found.' }); return; }
    if (quiz.status === 'active') { res.status(400).json({ success: false, message: 'Quiz already active.' }); return; }

    quiz.status    = 'active';
    quiz.startedAt = new Date();
    await quiz.save();
    res.json({ success: true, quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to start quiz.' });
  }
};

export const endQuiz: RequestHandler = async (req, res): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) { res.status(404).json({ success: false, message: 'Quiz not found.' }); return; }

    quiz.status  = 'completed';
    quiz.endedAt = new Date();
    await quiz.save();
    cancelQuiz(req.params.id);
    res.json({ success: true, quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to end quiz.' });
  }
};

// ── UPLOAD IMAGE ─────────────────────────────────────────────────────────────

export const uploadImage: RequestHandler = async (req, res): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const file = (req as any).file as Express.MulterS3.File | undefined;
  if (!file) { res.status(400).json({ success: false, message: 'No image uploaded.' }); return; }
  res.json({ success: true, url: file.location });
};

// ── REMOVE IMAGE ──────────────────────────────────────────────────────────────

export const removeImage: RequestHandler = async (req, res): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) { res.status(404).json({ success: false, message: 'Quiz not found.' }); return; }
    if (quiz.image) {
      await deleteImageByUrl(quiz.image);
      quiz.image = null;
      await quiz.save();
    }
    res.json({ success: true, quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to remove image.' });
  }
};

// ── ACTIVE QUIZZES ────────────────────────────────────────────────────────────

export const getActiveQuizzes: RequestHandler = async (_req, res): Promise<void> => {
  try {
    const quizzes = await Quiz.find({ status: 'active' }).sort({ startedAt: -1 }).lean();
    res.json({ success: true, quizzes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch active quizzes.' });
  }
};
