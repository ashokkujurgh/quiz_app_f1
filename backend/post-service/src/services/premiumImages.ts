import crypto from 'crypto';
import { Types } from 'mongoose';
import OpenAI from 'openai';
import UploadedAsset from '../models/UploadedAsset';
import PremiumPost from '../models/PremiumPost';
import { AiImageCandidate, AiImageUsage, IAiImageCandidate } from '../models/AiImage';
import { validateAndNormalize } from './imageProcessing';
import { putPublicObject, deleteObject, isStorageConfigured } from '../config/spaces';
import { requireCreatorNow } from './billingClient';
import { toPlainText } from '../utils/html';
import { istDay } from '../utils/ist';
import { AppError } from '../utils/errors';

const CANDIDATE_TTL_MS = 24 * 60 * 60 * 1000;
const GENERATION_LOCK_MS = 3 * 60 * 1000;

function assertStorage(): void {
  if (!isStorageConfigured()) throw new AppError(503, 'Image uploads are not available right now.', 'STORAGE_NOT_CONFIGURED');
}

// ── Uploads ──────────────────────────────────────────────────────────────────

export async function uploadPremiumImage(userId: string, file: Buffer | undefined) {
  await requireCreatorNow(userId);
  assertStorage();
  if (!file) throw new AppError(400, 'Choose an image to upload (field "image").');
  const img = await validateAndNormalize(file);
  const key = `premium/${userId}/${crypto.randomUUID()}.webp`;
  const url = await putPublicObject(key, img.buffer, img.mime);
  const asset = await UploadedAsset.create({ ownerId: new Types.ObjectId(userId), url, key, width: img.width, height: img.height, bytes: img.buffer.length, mime: img.mime, source: 'upload' });
  return { id: asset._id.toString(), url, width: img.width, height: img.height, bytes: img.buffer.length };
}

// ── AI images ────────────────────────────────────────────────────────────────

export function aiImageConfig() {
  const enabled = !!process.env.OPENAI_API_KEY && process.env.AI_IMAGE_ENABLED === 'true' && isStorageConfigured();
  return {
    enabled,
    dailyLimit: Math.max(1, parseInt(process.env.AI_IMAGE_DAILY_LIMIT ?? '5', 10) || 5),
    message: enabled ? null : 'AI image generation is not available right now.',
  };
}

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90_000, maxRetries: 1 });
  return client;
}
/** Tests swap the provider. */
export function setOpenAIForTests(c: OpenAI | null): void { client = c; }

export async function aiUsageToday(userId: string) {
  const cfg = aiImageConfig();
  const u = await AiImageUsage.findOne({ creatorId: new Types.ObjectId(userId), istDay: istDay() }).lean();
  const used = u?.count ?? 0;
  return { ...cfg, used, remaining: Math.max(0, cfg.dailyLimit - used) };
}

/** Take one generation from today's allowance and a short one-at-a-time lock. */
async function claimGeneration(creatorId: Types.ObjectId, limit: number): Promise<string> {
  const day = istDay();
  const now = new Date();
  try {
    await AiImageUsage.updateOne({ creatorId, istDay: day }, { $setOnInsert: { count: 0, inFlightUntil: null } }, { upsert: true });
  } catch (err) { if ((err as { code?: number }).code !== 11000) throw err; }

  const claimed = await AiImageUsage.findOneAndUpdate(
    { creatorId, istDay: day, count: { $lt: limit }, $or: [{ inFlightUntil: null }, { inFlightUntil: { $lt: now } }] },
    { $inc: { count: 1 }, $set: { inFlightUntil: new Date(now.getTime() + GENERATION_LOCK_MS) } },
    { new: true }
  );
  if (claimed) return day;
  const u = await AiImageUsage.findOne({ creatorId, istDay: day }).lean();
  if (u && u.count >= limit) throw new AppError(429, `You can generate ${limit} AI images per day. Try again tomorrow or upload an image.`, 'AI_IMAGE_LIMIT');
  throw new AppError(409, 'An image is already being generated. Please wait for it to finish.', 'AI_IMAGE_BUSY');
}

async function finishGeneration(creatorId: Types.ObjectId, day: string, refund: boolean): Promise<void> {
  await AiImageUsage.updateOne({ creatorId, istDay: day }, { $set: { inFlightUntil: null }, ...(refund ? { $inc: { count: -1 } } : {}) });
}

const PROMPT_SYSTEM = `You write prompts for an image model that makes cover images for educational articles for Indian exam preparation.
Write ONE prompt (max 120 words) for a clean, relevant, informative illustration of the article's subject.
Rules: no text, letters, numbers or watermarks in the image; no real or recognisable people, politicians or celebrities; no logos or brand names; no flags used offensively; nothing violent, sexual, political-campaign-like or misleading; suitable for all ages.
Return only the prompt.`;

async function buildPrompt(title: string, plain: string, category: string): Promise<string> {
  const model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini';
  try {
    const r = await openai().chat.completions.create({
      model, temperature: 0.4, max_tokens: 220,
      messages: [
        { role: 'system', content: PROMPT_SYSTEM },
        { role: 'user', content: `Category: ${category}\nTitle: ${title}\nArticle (excerpt):\n${plain.slice(0, 2500)}` },
      ],
    });
    const p = r.choices[0]?.message?.content?.trim();
    if (p && p.length > 20) return p.slice(0, 1000);
  } catch (err) {
    console.warn('[ai-image] prompt LLM failed, using template:', (err as Error).message);
  }
  return `A clean, modern educational illustration about "${title}" (${category}), flat vector style, soft colours, no text, no people, no logos.`;
}

async function generatePng(prompt: string): Promise<Buffer> {
  const model = (process.env.OPENAI_IMAGE_MODELS ?? 'gpt-image-1').split(',')[0].trim();
  const r = await openai().images.generate({ model, prompt, size: '1536x1024', n: 1 });
  const item = r.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, 'base64');
  if (item?.url) {
    const res = await fetch(item.url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`image download ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error('image provider returned no image');
}

/**
 * Generate a cover image for a premium post on the creator's explicit request.
 * The result is a *candidate* the creator must accept; it is not attached to the post until then.
 * Failures from the provider don't use up the daily allowance.
 */
export async function generateCandidate(userId: string, premiumPostId: string) {
  await requireCreatorNow(userId);
  const cfg = aiImageConfig();
  if (!cfg.enabled) throw new AppError(503, cfg.message!, 'AI_IMAGE_DISABLED');
  if (!Types.ObjectId.isValid(premiumPostId)) throw new AppError(400, 'Invalid id.');
  const creatorId = new Types.ObjectId(userId);
  const post = await PremiumPost.findOne({ _id: new Types.ObjectId(premiumPostId), creatorId, deletedAt: null });
  if (!post) throw new AppError(404, 'Post not found.');
  const plain = toPlainText(post.draft.content || '');
  if (post.draft.title.length < 5 || plain.split(/\s+/).filter(Boolean).length < 30) {
    throw new AppError(422, 'Add a title and at least a short paragraph first, so the image matches your post.', 'AI_IMAGE_NEEDS_CONTENT');
  }

  const day = await claimGeneration(creatorId, cfg.dailyLimit);
  let refund = true;
  try {
    const prompt = await buildPrompt(post.draft.title, plain, [post.draft.topic, post.draft.subTopic].filter(Boolean).join(' › ') || 'General studies');
    const raw = await generatePng(prompt);
    const img = await validateAndNormalize(raw);
    const key = `premium/${userId}/ai/${crypto.randomUUID()}.webp`;
    const url = await putPublicObject(key, img.buffer, img.mime);
    const cand = await AiImageCandidate.create({
      premiumPostId: post._id, creatorId, prompt, url, key, width: img.width, height: img.height, bytes: img.buffer.length,
      status: 'candidate', expiresAt: new Date(Date.now() + CANDIDATE_TTL_MS),
    });
    refund = false;
    return candidateView(cand.toObject());
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error('[ai-image] generation failed:', (err as Error).message);
    throw new AppError(502, "The image couldn't be generated. This didn't use up your daily limit — please try again.", 'AI_IMAGE_FAILED');
  } finally {
    await finishGeneration(creatorId, day, refund);
  }
}

const candidateView = (c: IAiImageCandidate) => ({ id: c._id.toString(), url: c.url, width: c.width, height: c.height, status: c.status, expiresAt: c.expiresAt });

/** Accept a candidate: it becomes one of the creator's images and (by default) the post's cover. */
export async function acceptCandidate(userId: string, premiumPostId: string, candidateId: string, setAsCover = true) {
  await requireCreatorNow(userId);
  if (!Types.ObjectId.isValid(candidateId) || !Types.ObjectId.isValid(premiumPostId)) throw new AppError(400, 'Invalid id.');
  const creatorId = new Types.ObjectId(userId);
  const cand = await AiImageCandidate.findOneAndUpdate(
    { _id: new Types.ObjectId(candidateId), creatorId, premiumPostId: new Types.ObjectId(premiumPostId), status: 'candidate', expiresAt: { $gt: new Date() } },
    { $set: { status: 'accepted' } },
    { new: true }
  );
  if (!cand) throw new AppError(404, 'This image is no longer available. Generate a new one.');
  await UploadedAsset.updateOne(
    { url: cand.url },
    { $setOnInsert: { ownerId: creatorId, url: cand.url, key: cand.key, width: cand.width, height: cand.height, bytes: cand.bytes, mime: 'image/webp', source: 'ai' } },
    { upsert: true }
  );
  return { candidate: candidateView(cand.toObject()), setAsCover };
}

export async function discardCandidate(userId: string, candidateId: string) {
  if (!Types.ObjectId.isValid(candidateId)) throw new AppError(400, 'Invalid id.');
  const cand = await AiImageCandidate.findOneAndUpdate(
    { _id: new Types.ObjectId(candidateId), creatorId: new Types.ObjectId(userId), status: 'candidate' },
    { $set: { status: 'discarded' } },
    { new: true }
  );
  if (!cand) throw new AppError(404, 'Image not found.');
  await deleteObject(cand.key);
  return candidateView(cand.toObject());
}

/** Background: delete candidates nobody accepted. */
export async function cleanupExpiredCandidates(now = new Date()): Promise<number> {
  const due = await AiImageCandidate.find({ status: 'candidate', expiresAt: { $lt: now } }).limit(200).lean();
  for (const c of due) {
    const r = await AiImageCandidate.updateOne({ _id: c._id, status: 'candidate' }, { $set: { status: 'expired' } });
    if (r.modifiedCount) await deleteObject(c.key);
  }
  return due.length;
}
