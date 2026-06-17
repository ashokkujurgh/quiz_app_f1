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

const POST_SERVICE_URL = process.env.POST_SERVICE_URL ?? 'http://post-service:4004';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? 'http://auth-service:4001';
const ADMIN_EMAIL      = process.env.ADMIN_EMAIL      ?? 'admin@quizhub.com';
const ADMIN_PASSWORD   = process.env.ADMIN_PASSWORD   ?? 'Admin@123';

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

// ── Cache admin token so we don't re-login on every quiz end ─────────────────
let _adminToken: string | null = null;

async function getAdminToken(): Promise<string | null> {
  if (_adminToken) return _adminToken;
  try {
    const res = await axios.post(`${AUTH_SERVICE_URL}/api/admin/login`, {
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }, { timeout: 8000 });
    _adminToken = res.data?.accessToken ?? null;
    return _adminToken;
  } catch (err) {
    console.error('[quizPostService] admin login failed:', (err as Error).message);
    return null;
  }
}

// ── Build human-readable post content ────────────────────────────────────────
function buildPostContent(
  quizTitle:    string,
  leaderboard:  LeaderboardRow[],
  totalQ:       number,
  durationMin:  number,
): string {
  const top3 = leaderboard.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];

  const podium = top3
    .map((r, i) => `${medals[i]} ${r.userName} — ${r.score}/${totalQ} (${r.percentage}%)`)
    .join('\n');

  const participantCount = leaderboard.length;
  const avgPct = participantCount
    ? Math.round(leaderboard.reduce((s, r) => s + r.percentage, 0) / participantCount)
    : 0;

  return [
    `🏆 Quiz Completed: "${quizTitle}"`,
    '',
    `${participantCount} players competed over ${durationMin} min${durationMin !== 1 ? 's' : ''}.`,
    `Average score: ${avgPct}%`,
    '',
    '🎖 Top Finishers:',
    podium,
    '',
    'Think you can do better? Join the next quiz! 🚀',
  ].join('\n');
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
  // Only create posts for public quizzes
  if (payload.participation !== 'public') return;

  const token = await getAdminToken();
  if (!token) {
    console.warn('[quizPostService] No admin token — skipping post creation.');
    return;
  }

  const content = buildPostContent(
    payload.quizTitle,
    payload.leaderboard,
    payload.totalQuestions,
    payload.durationMinutes,
  );

  // Winner's quiz result embed (rank 1 player)
  const winner = payload.leaderboard[0];
  const quizResult = winner
    ? {
        quizId:     payload.quizId,
        quizTitle:  payload.quizTitle,
        category:   payload.topic,
        score:      winner.score,
        total:      winner.total ?? payload.totalQuestions,
        percentage: winner.percentage,
        rank:       1,
        duration:   payload.durationMinutes * 60,
      }
    : null;

  try {
    await axios.post(
      `${POST_SERVICE_URL}/api/posts`,
      {
        content,
        topic:          payload.topic || 'General',
        subTopic:       null,
        authorName:     payload.adminName,
        authorUsername: payload.adminUsername,
        authorAvatar:   payload.adminAvatar,
        quizResult,
        timezone:       'Asia/Kolkata',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    );
    console.log(`[quizPostService] Post created for quiz "${payload.quizTitle}"`);
    // Mark so the recovery cron skips this quiz
    await Quiz.findByIdAndUpdate(payload.quizId, { postCreated: true });
  } catch (err) {
    // Reset cached token on 401 so it refreshes next time
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      _adminToken = null;
    }
    console.error('[quizPostService] Failed to create post:', (err as Error).message);
  }
}

// ── Recovery: rebuild and post for any missed public quiz ────────────────────

/**
 * Called by the recovery cron job every 5 minutes.
 * Finds public completed quizzes that never got a feed post and retries.
 */
export async function recoverMissingPosts(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // only look back 24 h

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
