import { Response, RequestHandler } from 'express';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import Post, { IQuizResult, ISeoMeta } from '../models/Post';
import { AuthRequest } from '../middleware/auth';

// ── OpenAI client ─────────────────────────────────────────────────────────────
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ── helpers ───────────────────────────────────────────────────────────────────

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const toObjId = (id: string) => new mongoose.Types.ObjectId(id);

// Build a lean post with per-user flags (liked / saved)
function withUserFlags(post: Record<string, unknown>, userId?: string) {
  const likedBy  = (post['likedBy']  as string[]) ?? [];
  const savedBy  = (post['savedBy']  as string[]) ?? [];
  const liked  = userId ? likedBy.some((id) => id.toString() === userId) : false;
  const saved  = userId ? savedBy.some((id) => id.toString() === userId) : false;
  const commentsCount = (post['comments'] as unknown[])?.length ?? 0;
  const { likedBy: _l, savedBy: _s, comments: _c, ...rest } = post;
  return { ...rest, liked, saved, commentsCount };
}

// ── GET /api/posts ────────────────────────────────────────────────────────────
export const getPosts: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { topic, subTopic, page = '1', limit = '20', q } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { isActive: true };
    if (q?.trim()) {
      filter.$or = [
        { content:  { $regex: q.trim(), $options: 'i' } },
        { topic:    { $regex: q.trim(), $options: 'i' } },
        { subTopic: { $regex: q.trim(), $options: 'i' } },
      ];
    } else if (subTopic && subTopic !== 'All') {
      filter.subTopic = subTopic;
    } else if (topic && topic !== 'All') {
      filter.topic = { $regex: new RegExp(`^${topic}$`, 'i') };
    }

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip     = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
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

// ── Content policy filter (calls post-filter service) ────────────────────────
const POST_FILTER_URL = process.env.POST_FILTER_URL ?? 'http://post-filter:5100';

async function checkContentPolicy(content: string, imageUrl?: string | null): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const res = await fetch(`${POST_FILTER_URL}/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, image_url: imageUrl ?? null }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { allowed: true };
    return await res.json() as { allowed: boolean; reason?: string };
  } catch {
    return { allowed: true }; // fail open — don't block if filter is down
  }
}

// ── OpenAI second-layer validation ────────────────────────────────────────────
async function openAIValidate(
  content: string,
  topic: string,
  subTopic: string | null,
  imageUrls: string[],
): Promise<{ allowed: boolean; reason?: string }> {
  if (!openai) return { allowed: true }; // skip if key not configured

  try {
    const topicLabel = subTopic ? `${topic} > ${subTopic}` : topic;

    // Build message content — text + optional image URLs
    const userParts: OpenAI.Chat.ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: `You are a strict content moderator for an educational quiz social platform called Meenzo.

Evaluate the following post against two criteria:

1. TOPIC RELEVANCE — Does the post content genuinely relate to the selected topic: "${topicLabel}"?
   - Minor tangential mentions are NOT enough; the core subject must match.
   - A post about unrelated subjects posted under a wrong topic must be rejected.

2. CONTENT SAFETY — Does the post (text or images) contain any of the following?
   - Sexual, nudity, or adult content
   - Hate speech, harassment, or bullying
   - Violence or gore
   - Spam or misleading information
   - Abusive or profane language

Post content:
"""
${content}
"""

Respond ONLY with valid JSON (no markdown, no explanation outside JSON):
{
  "allowed": true | false,
  "reason": "brief reason if rejected, else null"
}`,
      },
    ];

    // Attach images for vision check if present
    for (const url of imageUrls.slice(0, 3)) {
      userParts.push({ type: 'image_url', image_url: { url, detail: 'low' } });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: userParts }],
      max_tokens: 120,
      temperature: 0,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '';
    // Strip markdown code fences if model wraps anyway
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(jsonStr) as { allowed: boolean; reason?: string | null };
    return { allowed: !!parsed.allowed, reason: parsed.reason ?? undefined };
  } catch (err) {
    console.error('[OpenAI validate] error (fail open):', err);
    return { allowed: true }; // fail open — don't block posts if OpenAI is down
  }
}

// ── POST /api/posts ───────────────────────────────────────────────────────────
export const createPost: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, image, images, topic, subTopic, timezone, quizResult, authorName, authorUsername, authorAvatar, seo } = req.body as {
      title?: string;
      content?: string;
      image?: string;
      images?: string[];
      topic?: string;
      subTopic?: string;
      timezone?: string;
      quizResult?: IQuizResult;
      authorName?: string;
      authorUsername?: string;
      authorAvatar?: string;
      seo?: { metaTitle?: string; metaDescription?: string; keywords?: string[]; ogTitle?: string; ogDescription?: string; ogImage?: string | null; canonical?: string | null };
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

    // Normalise image list — accept both legacy `image` and new `images[]`
    const imageList: string[] = images?.length
      ? images.slice(0, 5)
      : image ? [image] : [];

    if (imageList.length > 5) {
      res.status(400).json({ success: false, message: 'Maximum 5 images allowed per post.' }); return;
    }

    const userType: 'user' | 'admin' = (req.user as { role?: string })?.role === 'admin' ? 'admin' : 'user';

    // Check each image for content policy
    for (const imgUrl of imageList) {
      const imagePolicy = await checkContentPolicy('', imgUrl);
      if (!imagePolicy.allowed) {
        res.status(422).json({
          success: false,
          message: `⚠️ One of your images was rejected: ${imagePolicy.reason ?? 'explicit content detected'}. Please use appropriate images.`,
        });
        return;
      }
    }

    if (userType === 'user' && content.trim()) {
      const textPolicy = await checkContentPolicy(content.trim());
      if (!textPolicy.allowed) {
        res.status(422).json({
          success: false,
          message: "⚠️ Your post couldn't be published. It appears to contain content that violates our Community Guidelines — including hate speech, harassment, explicit material, or harmful language. Please review and revise your post to keep Meenzo a safe and respectful space for everyone.",
        });
        return;
      }
    }

    // ── OpenAI second-layer: topic relevance + safety (all users including admin) ──
    const aiCheck = await openAIValidate(content.trim(), topic, subTopic ?? null, imageList);
    if (!aiCheck.allowed) {
      res.status(422).json({
        success: false,
        message: aiCheck.reason?.toLowerCase().includes('topic')
          ? `⚠️ Your post doesn't seem to belong to the "${subTopic ?? topic}" topic. Please post in the correct category or update your content to match.`
          : `⚠️ Your post was flagged by our content review: ${aiCheck.reason ?? 'policy violation detected'}. Please revise and try again.`,
      });
      return;
    }

    const post = await Post.create({
      author: {
        userId:   toObjId(req.user!.id),
        name:     authorName,
        username: authorUsername,
        avatar:   authorAvatar ?? null,
      },
      userType,
      title:      title?.trim() ?? null,
      content:    content.trim(),
      image:      imageList[0] ?? null,
      images:     imageList,
      topic,
      subTopic:   subTopic ?? null,
      timezone:   timezone ?? 'UTC',
      quizResult: quizResult ?? null,
      seo:        (seo as ISeoMeta | null | undefined) ?? null,
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

    const { title, content, image, topic, subTopic, timezone, isActive, seo } = req.body as {
      title?: string | null; content?: string; image?: string; topic?: string; subTopic?: string | null; timezone?: string; isActive?: boolean;
      seo?: { metaTitle?: string; metaDescription?: string; keywords?: string[]; ogTitle?: string; ogDescription?: string; ogImage?: string | null; canonical?: string | null } | null;
    };

    if (title     !== undefined) post.title    = title?.trim() ?? null;
    if (seo       !== undefined) post.seo      = (seo as typeof post.seo) ?? null;
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

    // Content policy check
    const policy = await checkContentPolicy(content.trim());
    if (!policy.allowed) {
      res.status(422).json({ success: false, message: `Comment blocked: ${policy.reason ?? 'policy violation'}` });
      return;
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
