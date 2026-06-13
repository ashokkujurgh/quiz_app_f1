import { Response, RequestHandler } from 'express';
import mongoose from 'mongoose';
import Post, { TOPICS, IQuizResult } from '../models/Post';
import { AuthRequest } from '../middleware/auth';

// ── helpers ───────────────────────────────────────────────────────────────────

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const toObjId = (id: string) => new mongoose.Types.ObjectId(id);

// Build a lean post with per-user flags (liked / saved)
function withUserFlags(post: Record<string, unknown>, userId?: string) {
  const likedBy  = (post['likedBy']  as string[]) ?? [];
  const savedBy  = (post['savedBy']  as string[]) ?? [];
  const liked  = userId ? likedBy.some((id) => id.toString() === userId) : false;
  const saved  = userId ? savedBy.some((id) => id.toString() === userId) : false;
  const { likedBy: _l, savedBy: _s, ...rest } = post;
  return { ...rest, liked, saved, commentsCount: (post['comments'] as unknown[])?.length ?? 0 };
}

// ── GET /api/posts ────────────────────────────────────────────────────────────
export const getPosts: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { topic, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { isActive: true };
    if (topic && topic !== 'All' && TOPICS.includes(topic as never)) {
      filter.topic = topic;
    }

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip     = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-comments') // comments fetched separately
        .lean(),
      Post.countDocuments(filter),
    ]);

    const userId = req.user?.id;
    const data = posts.map((p) => withUserFlags(p as Record<string, unknown>, userId));

    res.json({
      success: true,
      posts: data,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch posts.' });
  }
};

// ── GET /api/posts/:id ────────────────────────────────────────────────────────
export const getPost: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(400).json({ success: false, message: 'Invalid post id.' }); return; }

    const post = await Post.findById(req.params.id).lean();
    if (!post || !post.isActive) { res.status(404).json({ success: false, message: 'Post not found.' }); return; }

    res.json({ success: true, post: withUserFlags(post as Record<string, unknown>, req.user?.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch post.' });
  }
};

// ── POST /api/posts ───────────────────────────────────────────────────────────
export const createPost: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { content, image, topic, subTopic, timezone, quizResult, authorName, authorUsername, authorAvatar } = req.body as {
      content?: string;
      image?: string;
      topic?: string;
      subTopic?: string;
      timezone?: string;
      quizResult?: IQuizResult;
      authorName?: string;
      authorUsername?: string;
      authorAvatar?: string;
    };

    if (!content?.trim()) {
      res.status(400).json({ success: false, message: 'Post content is required.' }); return;
    }
    if (!topic?.trim()) {
      res.status(400).json({ success: false, message: 'Topic is required.' }); return;
    }
    if (!authorName || !authorUsername) {
      res.status(400).json({ success: false, message: 'Author name and username are required.' }); return;
    }

    const post = await Post.create({
      author: {
        userId:   toObjId(req.user!.id),
        name:     authorName,
        username: authorUsername,
        avatar:   authorAvatar ?? null,
      },
      content:    content.trim(),
      image:      image ?? null,
      topic,
      subTopic:   subTopic ?? null,
      timezone:   timezone ?? 'UTC',
      quizResult: quizResult ?? null,
    });

    res.status(201).json({ success: true, post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create post.' });
  }
};

// ── PATCH /api/posts/:id ─────────────────────────────────────────────────────
export const updatePost: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(400).json({ success: false, message: 'Invalid post id.' }); return; }

    const post = await Post.findById(req.params.id);
    if (!post) { res.status(404).json({ success: false, message: 'Post not found.' }); return; }

    const isOwner = post.author.userId.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'admin';
    if (!isOwner && !isAdmin) {
      res.status(403).json({ success: false, message: 'Not authorised.' }); return;
    }

    const { content, image, topic, subTopic, timezone, isActive } = req.body as {
      content?: string; image?: string; topic?: string; subTopic?: string | null; timezone?: string; isActive?: boolean;
    };

    if (content   !== undefined) post.content  = content.trim();
    if (image     !== undefined) post.image    = image;
    if (topic?.trim()) post.topic = topic.trim();
    if (subTopic  !== undefined) post.subTopic = subTopic ?? null;
    if (timezone  !== undefined) post.timezone = timezone;
    if (isActive  !== undefined) post.isActive = isActive;

    await post.save();
    res.json({ success: true, post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update post.' });
  }
};

// ── DELETE /api/posts/:id ─────────────────────────────────────────────────────
export const deletePost: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(400).json({ success: false, message: 'Invalid post id.' }); return; }

    const post = await Post.findById(req.params.id);
    if (!post) { res.status(404).json({ success: false, message: 'Post not found.' }); return; }

    const isOwner = post.author.userId.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ success: false, message: 'Not authorised to delete this post.' }); return;
    }

    await post.deleteOne();
    res.json({ success: true, message: 'Post deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete post.' });
  }
};

// ── POST /api/posts/:id/like ──────────────────────────────────────────────────
export const toggleLike: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(400).json({ success: false, message: 'Invalid post id.' }); return; }

    const userId = toObjId(req.user!.id);
    const post   = await Post.findById(req.params.id);
    if (!post || !post.isActive) { res.status(404).json({ success: false, message: 'Post not found.' }); return; }

    const alreadyLiked = post.likedBy.some((id) => id.equals(userId));

    if (alreadyLiked) {
      post.likedBy = post.likedBy.filter((id) => !id.equals(userId));
      post.likes   = Math.max(0, post.likes - 1);
    } else {
      post.likedBy.push(userId);
      post.likes += 1;
    }

    await post.save();
    res.json({ success: true, liked: !alreadyLiked, likes: post.likes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to toggle like.' });
  }
};

// ── POST /api/posts/:id/save ──────────────────────────────────────────────────
export const toggleSave: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(400).json({ success: false, message: 'Invalid post id.' }); return; }

    const userId = toObjId(req.user!.id);
    const post   = await Post.findById(req.params.id);
    if (!post || !post.isActive) { res.status(404).json({ success: false, message: 'Post not found.' }); return; }

    const alreadySaved = post.savedBy.some((id) => id.equals(userId));

    if (alreadySaved) {
      post.savedBy = post.savedBy.filter((id) => !id.equals(userId));
    } else {
      post.savedBy.push(userId);
    }

    await post.save();
    res.json({ success: true, saved: !alreadySaved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to toggle save.' });
  }
};

// ── GET /api/posts/:id/comments ───────────────────────────────────────────────
export const getComments: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(400).json({ success: false, message: 'Invalid post id.' }); return; }

    const post = await Post.findById(req.params.id).select('comments isActive').lean();
    if (!post || !post.isActive) { res.status(404).json({ success: false, message: 'Post not found.' }); return; }

    const userId = req.user?.id;
    const comments = post.comments.map((c) => {
      const liked = userId
        ? (c.likedBy as unknown as string[]).some((id) => id.toString() === userId)
        : false;
      const { likedBy: _, ...rest } = c as typeof c & { likedBy: unknown };
      return { ...rest, liked };
    });

    res.json({ success: true, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch comments.' });
  }
};

// ── POST /api/posts/:id/comments ──────────────────────────────────────────────
export const addComment: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(400).json({ success: false, message: 'Invalid post id.' }); return; }

    const { content, authorName, authorUsername, authorAvatar } = req.body as {
      content?: string;
      authorName?: string;
      authorUsername?: string;
      authorAvatar?: string;
    };

    if (!content?.trim()) {
      res.status(400).json({ success: false, message: 'Comment content is required.' }); return;
    }
    if (!authorName || !authorUsername) {
      res.status(400).json({ success: false, message: 'Author info is required.' }); return;
    }

    const post = await Post.findById(req.params.id);
    if (!post || !post.isActive) { res.status(404).json({ success: false, message: 'Post not found.' }); return; }

    const comment = {
      author: {
        userId:   toObjId(req.user!.id),
        name:     authorName,
        username: authorUsername,
        avatar:   authorAvatar ?? null,
      },
      content: content.trim(),
      likes:   0,
      likedBy: [],
    };

    post.comments.push(comment as never);
    await post.save();

    const saved = post.comments[post.comments.length - 1];
    res.status(201).json({ success: true, comment: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add comment.' });
  }
};

// ── DELETE /api/posts/:id/comments/:commentId ─────────────────────────────────
export const deleteComment: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id) || !isValidId(req.params.commentId)) {
      res.status(400).json({ success: false, message: 'Invalid id.' }); return;
    }

    const post = await Post.findById(req.params.id);
    if (!post) { res.status(404).json({ success: false, message: 'Post not found.' }); return; }

    const comment = post.comments.find((c) => c._id.toString() === req.params.commentId);
    if (!comment) { res.status(404).json({ success: false, message: 'Comment not found.' }); return; }

    const isOwner = comment.author.userId.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'admin';
    if (!isOwner && !isAdmin) {
      res.status(403).json({ success: false, message: 'Not authorised.' }); return;
    }

    post.comments = post.comments.filter((c) => c._id.toString() !== req.params.commentId);
    await post.save();

    res.json({ success: true, message: 'Comment deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete comment.' });
  }
};

// ── POST /api/posts/:id/comments/:commentId/like ──────────────────────────────
export const toggleCommentLike: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id) || !isValidId(req.params.commentId)) {
      res.status(400).json({ success: false, message: 'Invalid id.' }); return;
    }

    const userId = toObjId(req.user!.id);
    const post   = await Post.findById(req.params.id);
    if (!post) { res.status(404).json({ success: false, message: 'Post not found.' }); return; }

    const comment = post.comments.find((c) => c._id.toString() === req.params.commentId);
    if (!comment) { res.status(404).json({ success: false, message: 'Comment not found.' }); return; }

    const alreadyLiked = comment.likedBy.some((id) => id.equals(userId));
    if (alreadyLiked) {
      comment.likedBy = comment.likedBy.filter((id) => !id.equals(userId));
      comment.likes   = Math.max(0, comment.likes - 1);
    } else {
      comment.likedBy.push(userId);
      comment.likes += 1;
    }

    await post.save();
    res.json({ success: true, liked: !alreadyLiked, likes: comment.likes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to toggle comment like.' });
  }
};

// ── GET /api/posts/user/:userId ───────────────────────────────────────────────
export const getUserPosts: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.userId)) { res.status(400).json({ success: false, message: 'Invalid user id.' }); return; }

    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip     = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      Post.find({ 'author.userId': toObjId(req.params.userId), isActive: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-comments')
        .lean(),
      Post.countDocuments({ 'author.userId': toObjId(req.params.userId), isActive: true }),
    ]);

    const userId = req.user?.id;
    const data = posts.map((p) => withUserFlags(p as Record<string, unknown>, userId));

    res.json({
      success: true,
      posts: data,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch user posts.' });
  }
};
