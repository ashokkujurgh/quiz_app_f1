import { Request, Response, RequestHandler } from 'express';
import mongoose from 'mongoose';
import Question from '../models/Question';

type Difficulty = 'easy' | 'medium' | 'hard';

// ── helpers ───────────────────────────────────────────────────────────────────

function isValidId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// ── GET /api/questions ────────────────────────────────────────────────────────
// Query params: topic, subTopic, difficulty, page, limit, search
export const getQuestions: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { topic, subTopic, difficulty, page = '1', limit = '20', search } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { isActive: true };

    if (topic) {
      if (!isValidId(topic)) { res.status(400).json({ success: false, message: 'Invalid topic id.' }); return; }
      filter.topic = new mongoose.Types.ObjectId(topic);
    }
    if (subTopic) {
      if (!isValidId(subTopic)) { res.status(400).json({ success: false, message: 'Invalid subTopic id.' }); return; }
      filter.subTopic = new mongoose.Types.ObjectId(subTopic);
    }
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      filter.difficulty = difficulty;
    }
    if (search?.trim()) {
      filter.text = { $regex: search.trim(), $options: 'i' };
    }

    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip     = (pageNum - 1) * limitNum;

    const [questions, total] = await Promise.all([
      Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Question.countDocuments(filter),
    ]);

    res.json({
      success: true,
      questions,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch questions.' });
  }
};

// ── GET /api/questions/:id ────────────────────────────────────────────────────
export const getQuestion: RequestHandler = async (req: Request, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(400).json({ success: false, message: 'Invalid question id.' }); return; }
    const question = await Question.findById(req.params.id).lean();
    if (!question) { res.status(404).json({ success: false, message: 'Question not found.' }); return; }
    res.json({ success: true, question });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch question.' });
  }
};

// ── POST /api/questions ───────────────────────────────────────────────────────
export const createQuestion: RequestHandler = async (req: Request, res: Response) => {
  try {
    const {
      text,
      description,
      options,
      correctOption,
      topic,
      subTopic,
      difficulty,
    } = req.body as {
      text?: string;
      description?: string;
      options?: { text: string }[];
      correctOption?: number;
      topic?: string;
      subTopic?: string;
      difficulty?: Difficulty;
    };

    if (!text?.trim()) {
      res.status(400).json({ success: false, message: 'Question text is required.' }); return;
    }
    if (!Array.isArray(options) || options.length !== 4 || options.some((o) => !o?.text?.trim())) {
      res.status(400).json({ success: false, message: 'Exactly 4 non-empty options are required.' }); return;
    }
    if (correctOption === undefined || ![0, 1, 2, 3].includes(correctOption)) {
      res.status(400).json({ success: false, message: 'correctOption must be 0, 1, 2, or 3.' }); return;
    }
    if (!topic || !isValidId(topic)) {
      res.status(400).json({ success: false, message: 'A valid topic id is required.' }); return;
    }
    if (subTopic && !isValidId(subTopic)) {
      res.status(400).json({ success: false, message: 'Invalid subTopic id.' }); return;
    }

    const question = await Question.create({
      text: text.trim(),
      description: description?.trim() ?? '',
      options: options.map((o) => ({ text: o.text.trim() })),
      correctOption,
      topic,
      subTopic: subTopic ?? null,
      difficulty: difficulty ?? 'medium',
    });

    res.status(201).json({ success: true, question });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create question.' });
  }
};

// ── PATCH /api/questions/:id ──────────────────────────────────────────────────
export const updateQuestion: RequestHandler = async (req: Request, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(400).json({ success: false, message: 'Invalid question id.' }); return; }

    const {
      text,
      description,
      options,
      correctOption,
      topic,
      subTopic,
      difficulty,
      isActive,
    } = req.body as {
      text?: string;
      description?: string;
      options?: { text: string }[];
      correctOption?: number;
      topic?: string;
      subTopic?: string | null;
      difficulty?: Difficulty;
      isActive?: boolean;
    };

    if (options !== undefined) {
      if (!Array.isArray(options) || options.length !== 4 || options.some((o) => !o?.text?.trim())) {
        res.status(400).json({ success: false, message: 'Exactly 4 non-empty options are required.' }); return;
      }
    }
    if (correctOption !== undefined && ![0, 1, 2, 3].includes(correctOption)) {
      res.status(400).json({ success: false, message: 'correctOption must be 0, 1, 2, or 3.' }); return;
    }
    if (topic && !isValidId(topic)) {
      res.status(400).json({ success: false, message: 'Invalid topic id.' }); return;
    }
    if (subTopic && !isValidId(subTopic)) {
      res.status(400).json({ success: false, message: 'Invalid subTopic id.' }); return;
    }

    const update: Record<string, unknown> = {};
    if (text        !== undefined) update.text          = text.trim();
    if (description !== undefined) update.description   = description.trim();
    if (options     !== undefined) update.options       = options.map((o) => ({ text: o.text.trim() }));
    if (correctOption !== undefined) update.correctOption = correctOption;
    if (topic       !== undefined) update.topic         = topic;
    if (subTopic    !== undefined) update.subTopic      = subTopic ?? null;
    if (difficulty  !== undefined) update.difficulty    = difficulty;
    if (isActive    !== undefined) update.isActive      = isActive;

    const question = await Question.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!question) { res.status(404).json({ success: false, message: 'Question not found.' }); return; }
    res.json({ success: true, question });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update question.' });
  }
};

// ── DELETE /api/questions/:id ─────────────────────────────────────────────────
export const deleteQuestion: RequestHandler = async (req: Request, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(400).json({ success: false, message: 'Invalid question id.' }); return; }
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) { res.status(404).json({ success: false, message: 'Question not found.' }); return; }
    res.json({ success: true, message: 'Question deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete question.' });
  }
};

// ── GET /api/questions/stats ──────────────────────────────────────────────────
export const getStats: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const [byDifficulty, byTopic, total] = await Promise.all([
      Question.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      ]),
      Question.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$topic', count: { $sum: 1 } } },
      ]),
      Question.countDocuments({ isActive: true }),
    ]);

    res.json({ success: true, stats: { total, byDifficulty, byTopic } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
};
