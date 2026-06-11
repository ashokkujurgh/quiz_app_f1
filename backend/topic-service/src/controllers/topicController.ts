import { Request, Response, RequestHandler } from 'express';
import Topic from '../models/Topic';
import SubTopic from '../models/SubTopic';

// ═══════════════════════════════════════════════════════════
// TOPICS
// ═══════════════════════════════════════════════════════════

// GET /api/topics
export const getTopics: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const topics = await Topic.find().sort({ name: 1 }).lean();
    const counts = await SubTopic.aggregate([
      { $group: { _id: '$topic', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
    const data = topics.map((t) => ({ ...t, subTopicCount: countMap[String(t._id)] ?? 0 }));
    res.json({ success: true, topics: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch topics.' });
  }
};

// GET /api/topics/:id
export const getTopic: RequestHandler = async (req: Request, res: Response) => {
  try {
    const topic = await Topic.findById(req.params.id).lean();
    if (!topic) { res.status(404).json({ success: false, message: 'Topic not found.' }); return; }
    res.json({ success: true, topic });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch topic.' });
  }
};

// POST /api/topics
export const createTopic: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name?.trim()) {
      res.status(400).json({ success: false, message: 'Topic name is required.' });
      return;
    }
    const existing = await Topic.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) {
      res.status(409).json({ success: false, message: 'Topic already exists.' });
      return;
    }
    const topic = await Topic.create({ name: name.trim(), description: description?.trim() ?? '' });
    res.status(201).json({ success: true, topic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create topic.' });
  }
};

// PATCH /api/topics/:id
export const updateTopic: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { name, description, isActive } = req.body as {
      name?: string; description?: string; isActive?: boolean;
    };
    const topic = await Topic.findByIdAndUpdate(
      req.params.id,
      {
        ...(name        !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(isActive    !== undefined && { isActive }),
      },
      { new: true, runValidators: true }
    );
    if (!topic) { res.status(404).json({ success: false, message: 'Topic not found.' }); return; }
    res.json({ success: true, topic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update topic.' });
  }
};

// DELETE /api/topics/:id
export const deleteTopic: RequestHandler = async (req: Request, res: Response) => {
  try {
    const topic = await Topic.findByIdAndDelete(req.params.id);
    if (!topic) { res.status(404).json({ success: false, message: 'Topic not found.' }); return; }
    await SubTopic.deleteMany({ topic: req.params.id });
    res.json({ success: true, message: 'Topic and its subtopics deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete topic.' });
  }
};

// ═══════════════════════════════════════════════════════════
// SUBTOPICS
// ═══════════════════════════════════════════════════════════

// GET /api/topics/:id/subtopics
export const getSubTopics: RequestHandler = async (req: Request, res: Response) => {
  try {
    const subtopics = await SubTopic.find({ topic: req.params.id }).sort({ name: 1 }).lean();
    res.json({ success: true, subtopics });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch subtopics.' });
  }
};

// POST /api/topics/:id/subtopics
export const createSubTopic: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name?.trim()) {
      res.status(400).json({ success: false, message: 'Subtopic name is required.' });
      return;
    }
    const topicExists = await Topic.findById(req.params.id);
    if (!topicExists) {
      res.status(404).json({ success: false, message: 'Topic not found.' });
      return;
    }
    const existing = await SubTopic.findOne({
      topic: req.params.id,
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
    });
    if (existing) {
      res.status(409).json({ success: false, message: 'Subtopic already exists under this topic.' });
      return;
    }
    const subtopic = await SubTopic.create({
      name: name.trim(),
      description: description?.trim() ?? '',
      topic: req.params.id,
    });
    res.status(201).json({ success: true, subtopic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create subtopic.' });
  }
};

// PATCH /api/subtopics/:id
export const updateSubTopic: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { name, description, isActive } = req.body as {
      name?: string; description?: string; isActive?: boolean;
    };
    const subtopic = await SubTopic.findByIdAndUpdate(
      req.params.id,
      {
        ...(name        !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(isActive    !== undefined && { isActive }),
      },
      { new: true, runValidators: true }
    );
    if (!subtopic) { res.status(404).json({ success: false, message: 'Subtopic not found.' }); return; }
    res.json({ success: true, subtopic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update subtopic.' });
  }
};

// DELETE /api/subtopics/:id
export const deleteSubTopic: RequestHandler = async (req: Request, res: Response) => {
  try {
    const subtopic = await SubTopic.findByIdAndDelete(req.params.id);
    if (!subtopic) { res.status(404).json({ success: false, message: 'Subtopic not found.' }); return; }
    res.json({ success: true, message: 'Subtopic deleted.' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to delete subtopic.' });
  }
};
