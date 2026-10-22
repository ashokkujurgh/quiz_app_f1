import crypto from 'crypto';
import axios from 'axios';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import PendingView from '../models/PendingView';
import AnonLink from '../models/AnonLink';
import { billingConfigured } from './billingClient';
import { istDay } from '../utils/ist';

// Server-side view counting for premium posts. The browser never sends a count: the post API
// hands out a short-lived signed view token, and the page sends it back after the post has been
// on screen for a few seconds. Viewer identity is the account id, or a random anonymous id kept in
// a first-party cookie — no personal data. IPs are only kept as a daily-rotating hash.

const COOKIE = 'mz_vid';
const TOKEN_TTL_MS = 30 * 60 * 1000;
const BOT_UA = /bot|crawl|spider|slurp|bingpreview|mediapartners|adsbot|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pagespeed|phantom|selenium|puppeteer|playwright|curl|wget|python|axios|node-fetch|go-http|java\/|okhttp|httpclient|preview/i;

export function trackingEnabled(): boolean {
  return !!process.env.VIEW_TOKEN_SECRET && billingConfigured();
}

const minDwellMs = () => Math.max(0, parseInt(process.env.VIEW_MIN_DWELL_SECONDS ?? '5', 10) || 0) * 1000;

function hmac(data: string, len = 32): string {
  return crypto.createHmac('sha256', process.env.VIEW_TOKEN_SECRET!).update(data).digest('base64url').slice(0, len);
}

function safeEq(a: string, b: string): boolean {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function isBot(userAgent: string | undefined): boolean {
  return !userAgent || userAgent.length < 10 || BOT_UA.test(userAgent);
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function anonIdFromCookie(req: Request): string | null {
  const raw = readCookie(req, COOKIE);
  if (!raw) return null;
  const [id, sig] = raw.split('.');
  if (!id || !sig || !/^[A-Za-z0-9_-]{16,32}$/.test(id) || !safeEq(sig, hmac(`vid:${id}`, 16))) return null;
  return id;
}

/** Viewer key for this request; creates the anonymous cookie when needed (only when issuing a token). */
const anonIdOfRequest = new WeakMap<Request, string>();

export function viewerKeyFor(req: Request & { user?: { id: string } }, res?: Response): string | null {
  let id = anonIdFromCookie(req);
  if (!id && res) {
    id = crypto.randomBytes(16).toString('base64url');
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.append('Set-Cookie', `${COOKIE}=${id}.${hmac(`vid:${id}`, 16)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`);
  }
  if (id) anonIdOfRequest.set(req, id);
  if (req.user?.id) return `u:${req.user.id}`;
  return id ? `a:${id}` : null;
}

/** Remember that this browser's anonymous id belongs to the logged-in account (self-view detection after logout). */
export async function rememberBrowser(req: Request & { user?: { id: string } }): Promise<void> {
  const id = anonIdOfRequest.get(req) ?? anonIdFromCookie(req);   // includes a cookie just issued
  if (!id || !req.user?.id || !Types.ObjectId.isValid(req.user.id)) return;
  await AnonLink.updateOne({ anonId: id }, { $set: { userId: new Types.ObjectId(req.user.id) } }, { upsert: true }).catch(() => undefined);
}

/** The account an anonymous browser id was last used with, if any. */
export async function linkedUser(viewerKey: string): Promise<string | null> {
  if (!viewerKey.startsWith('a:')) return null;
  const l = await AnonLink.findOne({ anonId: viewerKey.slice(2) }).select('userId').lean();
  return l?.userId.toString() ?? null;
}

export function issueViewToken(postId: string, viewerKey: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ p: postId, v: viewerKey, t: now })).toString('base64url');
  return `${payload}.${hmac(`vt:${payload}`)}`;
}

export type TokenCheck = { ok: true; postId: string; viewerKey: string; issuedAt: number } | { ok: false; reason: string };

export function verifyViewToken(token: unknown, now = Date.now()): TokenCheck {
  if (typeof token !== 'string' || token.length > 600) return { ok: false, reason: 'malformed' };
  const [payload, sig] = token.split('.');
  if (!payload || !sig || !safeEq(sig, hmac(`vt:${payload}`))) return { ok: false, reason: 'bad_signature' };
  let data: { p?: string; v?: string; t?: number };
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return { ok: false, reason: 'malformed' }; }
  if (!data.p || !data.v || typeof data.t !== 'number') return { ok: false, reason: 'malformed' };
  if (now - data.t > TOKEN_TTL_MS) return { ok: false, reason: 'expired' };
  if (now - data.t < minDwellMs()) return { ok: false, reason: 'too_soon' };
  return { ok: true, postId: data.p, viewerKey: data.v, issuedAt: data.t };
}

/** Daily-rotating salted hash of the client IP (cannot be reversed or linked across days). */
export function ipHash(ip: string | undefined): string | null {
  if (!ip) return null;
  return hmac(`ip:${istDay()}:${ip}`, 24);
}

// ── Delivery to billing-service ────────────────────────────────────────────────

export interface ViewRecord { postId: string; premiumPostId: string; creatorId: string; viewerKey: string; ipHash: string | null; occurredAt: Date }

async function deliver(v: ViewRecord): Promise<void> {
  await axios.post(`${process.env.BILLING_SERVICE_URL}/internal/views/record`,
    { ...v, occurredAt: v.occurredAt.toISOString() },
    { headers: { 'x-internal-secret': process.env.INTERNAL_SERVICE_SECRET! }, timeout: 5000 });
}

/** Send a checked view to billing; if billing is unreachable keep it for retry. Never throws. */
export async function sendView(v: ViewRecord, tokenIssuedAt: number): Promise<void> {
  try {
    await deliver(v);
  } catch (err) {
    console.warn('[views] billing unreachable, queued for retry:', (err as Error).message);
    await PendingView.create({
      postId: new Types.ObjectId(v.postId), premiumPostId: new Types.ObjectId(v.premiumPostId), creatorId: new Types.ObjectId(v.creatorId),
      viewerKey: v.viewerKey, ipHash: v.ipHash, occurredAt: v.occurredAt, dedupeKey: `${v.postId}|${v.viewerKey}|${tokenIssuedAt}`,
      nextAttemptAt: new Date(Date.now() + 60_000),
    }).catch((e) => { if ((e as { code?: number }).code !== 11000) console.error('[views] queue failed:', e); });
  }
}

export async function retryPendingViews(now = new Date()): Promise<number> {
  if (!trackingEnabled()) return 0;
  const due = await PendingView.find({ nextAttemptAt: { $lte: now } }).limit(500).lean();
  let sent = 0;
  for (const p of due) {
    try {
      await deliver({ postId: p.postId.toString(), premiumPostId: p.premiumPostId.toString(), creatorId: p.creatorId.toString(), viewerKey: p.viewerKey, ipHash: p.ipHash, occurredAt: p.occurredAt });
      await PendingView.deleteOne({ _id: p._id });
      sent++;
    } catch {
      await PendingView.updateOne({ _id: p._id }, { $inc: { attempts: 1 }, $set: { nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** (p.attempts + 1)) * 60_000) } });
    }
  }
  return sent;
}

// ── Per-viewer hourly cap (refresh/scroll loops, scripted viewers) ─────────────
const MAX_VIEWS_PER_VIEWER_HOUR = 60;
const recent = new Map<string, { hour: number; n: number }>();
export function overViewerCap(viewerKey: string, now = Date.now()): boolean {
  const hour = Math.floor(now / 3_600_000);
  const cur = recent.get(viewerKey);
  if (!cur || cur.hour !== hour) { recent.set(viewerKey, { hour, n: 1 }); if (recent.size > 200_000) recent.clear(); return false; }
  cur.n++;
  return cur.n > MAX_VIEWS_PER_VIEWER_HOUR;
}
