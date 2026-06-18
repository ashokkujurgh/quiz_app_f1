/**
 * quizPostService.ts
 *
 * When an admin/public quiz ends, automatically create a summary post
 * in the post-service so the game shows up in everyone's feed.
 *
 * Called from gameController after buildLeaderboard().
 */

import axios from 'axios';
import Quiz from '../models/Quiz';
import GameHistory from '../models/GameHistory';

const POST_SERVICE_URL  = process.env.POST_SERVICE_URL        ?? 'http://post-service:4004';
const TOPIC_SERVICE_URL = process.env.TOPIC_SERVICE_URL       ?? 'http://topic-service:4002';
const AUTH_SERVICE_URL  = process.env.AUTH_SERVICE_URL        ?? 'http://auth-service:4001';
const INTERNAL_SECRET   = process.env.INTERNAL_SERVICE_SECRET ?? 'internal-quiz-secret';

const ID_RE = /^[0-9a-f]{24}$/i;

async function enrichPlayerNames(rows: LeaderboardRow[]): Promise<LeaderboardRow[]> {
  const needsEnrich = rows.filter((r) => ID_RE.test(r.userName));
  if (needsEnrich.length === 0) return rows;
  try {
    const ids = needsEnrich.map((r) => r.userId);
    const { data } = await axios.post(`${AUTH_SERVICE_URL}/api/auth/users/bulk`, { ids }, { timeout: 6000 });
    if (data.success) {
      const nameMap = new Map<string, string>(
        (data.users as { _id: string; name?: string; username?: string }[])
          .map((u) => [u._id, u.name || u.username || u._id])
      );
      return rows.map((r) => ID_RE.test(r.userName) ? { ...r, userName: nameMap.get(r.userId) ?? r.userName } : r);
    }
  } catch { /* non-fatal */ }
  return rows;
}

async function resolveTopicName(topicId: string): Promise<string> {
  if (!topicId || topicId === 'General') return topicId || 'General';
  try {
    // Try as a topic first
    const { data } = await axios.get(`${TOPIC_SERVICE_URL}/api/topics/${topicId}`, { timeout: 4000 });
    if (data?.topic?.name) return data.topic.name;
  } catch { /* not a topic id — try subtopics */ }
  try {
    // Scan all topics' subtopics to find matching id
    const { data } = await axios.get(`${TOPIC_SERVICE_URL}/api/topics`, { timeout: 4000 });
    const topics: { _id: string }[] = data?.topics ?? [];
    for (const t of topics) {
      const { data: sub } = await axios.get(`${TOPIC_SERVICE_URL}/api/topics/${t._id}/subtopics`, { timeout: 4000 });
      const match = (sub?.subtopics ?? []).find((s: { _id: string; name: string }) => s._id === topicId);
      if (match) return match.name;
    }
  } catch { /* ignore */ }
  return 'General';
}

// ── Leaderboard entry shape (matches gameController) ─────────────────────────
interface LeaderboardRow {
  userId:      string;
  userName:    string;
  userAvatar?: string;
  score:       number;
  total:       number;
  percentage:  number;
  rank:        number;
  timeTaken:   number;
}


// ── Minimal content — real data lives in the quizResult card ─────────────────
function buildPostContent(quizTitle: string): string {
  return quizTitle;
}

// ── Public API ────────────────────────────────────────────────────────────────

interface QuizEndedPayload {
  quizId:         string;
  quizTitle:      string;
  topic:          string;       // topic name string (may be ObjectId if unresolved)
  participation:  string;       // 'public' | 'private' | 'invite_only'
  leaderboard:    LeaderboardRow[];
  totalQuestions: number;
  durationMinutes: number;
  adminUserId:    string;
  adminName:      string;
  adminUsername:  string;
  adminAvatar:    string | null;
}

/**
 * Create a feed post summarising the finished quiz.
 * Only fires for 'public' participation quizzes (admin quizzes).
 * Silently swallows errors so it never blocks the game flow.
 */
export async function createQuizEndedPost(payload: QuizEndedPayload): Promise<void> {
  if (payload.participation !== 'public') return;
  if (payload.leaderboard.length === 0) {
    await Quiz.findByIdAndUpdate(payload.quizId, { postCreated: true });
    return;
  }

  const [topicName, enrichedLeaderboard] = await Promise.all([
    resolveTopicName(payload.topic),
    enrichPlayerNames(payload.leaderboard),
  ]);
  const content = buildPostContent(payload.quizTitle);

  // Winner's quiz result embed (rank 1 player)
  const winner = enrichedLeaderboard[0];
  const playerCount = enrichedLeaderboard.length;
  const avgPercentage = playerCount
    ? Math.round(enrichedLeaderboard.reduce((s, r) => s + r.percentage, 0) / playerCount)
    : 0;
  const topPlayers = enrichedLeaderboard.map((r, i) => ({
    rank:       i + 1,
    name:       r.userName,
    score:      r.score,
    total:      r.total ?? payload.totalQuestions,
    percentage: r.percentage,
  }));
  const quizResult = winner
    ? {
        quizId:        payload.quizId,
        quizTitle:     payload.quizTitle,
        category:      topicName,
        score:         winner.score,
        total:         winner.total ?? payload.totalQuestions,
        percentage:    winner.percentage,
        rank:          1,
        duration:      payload.durationMinutes * 60,
        playerCount,
        avgPercentage,
        topPlayers,
      }
    : null;

  try {
    await axios.post(
      `${POST_SERVICE_URL}/api/posts/internal`,
      {
        content,
        topic:          topicName,
        subTopic:       null,
        authorName:     payload.adminName,
        authorUsername: payload.adminUsername,
        authorAvatar:   payload.adminAvatar,
        authorUserId:   payload.adminUserId,
        quizResult,
      },
      {
        headers: {
          'x-internal-secret': INTERNAL_SECRET,
          'Content-Type':      'application/json',
        },
        timeout: 10000,
      },
    );
    console.log(`[quizPostService] Post created for quiz "${payload.quizTitle}"`);
    await Quiz.findByIdAndUpdate(payload.quizId, { postCreated: true });
  } catch (err) {
    console.error('[quizPostService] Failed to create post:', (err as Error).message);
  }
}

// ── Recovery: rebuild and post for any missed public quiz ────────────────────

/**
 * Called by the recovery cron job every 5 minutes.
 * Finds public completed quizzes that never got a feed post and retries.
 */
export async function recoverMissingPosts(): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // look back 7 days

  const missed = await Quiz.find({
    status:        'completed',
    participation: 'public',
    postCreated:   { $ne: true },
    endedAt:       { $gte: cutoff },
  }).lean();

  if (missed.length === 0) return;

  console.log(`[postRecovery] Found ${missed.length} quiz(es) without a post — retrying…`);

  for (const quiz of missed) {
    const quizId = quiz._id.toString();

    // Rebuild leaderboard from persisted GameHistory rows
    const histories = await GameHistory.find({ quizId: quiz._id })
      .sort({ score: -1, timeTaken: 1 })
      .lean();

    if (histories.length === 0) {
      // No players — mark as done so we stop retrying
      await Quiz.findByIdAndUpdate(quizId, { postCreated: true });
      continue;
    }

    const leaderboard: LeaderboardRow[] = histories.map((h, idx) => ({
      rank:       idx + 1,
      userId:     h.userId,
      userName:   h.userName,
      userAvatar: h.userAvatar,
      score:      h.score,
      total:      h.total,
      percentage: h.percentage,
      timeTaken:  h.timeTaken,
    }));

    await createQuizEndedPost({
      quizId,
      quizTitle:       quiz.title,
      topic:           quiz.topic?.toString() ?? 'General',
      participation:   quiz.participation,
      leaderboard,
      totalQuestions:  quiz.questionCount,
      durationMinutes: quiz.durationMinutes,
      adminUserId:     quiz.createdBy.toString(),
      adminName:       'QuizHub Admin',
      adminUsername:   'quizhub_admin',
      adminAvatar:     null,
    });
  }
}
