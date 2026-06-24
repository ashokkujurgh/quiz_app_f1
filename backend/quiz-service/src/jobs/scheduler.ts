import cron from 'node-cron';
import Quiz, { IQuiz } from '../models/Quiz';
import { startGameSession } from '../socket/gameController';
import { recoverMissingPosts } from '../services/quizPostService';
import { sendQuizReminder, sendQuizStarted } from '../services/notificationService';

// quizId → cron task handle
const _tasks = new Map<string, cron.ScheduledTask>();
// quizId → reminder setTimeout handle
const _reminders = new Map<string, ReturnType<typeof setTimeout>>();

const REMINDER_MS = 10 * 60 * 1000; // 10 minutes

// ── helpers ───────────────────────────────────────────────────────────────────

function toCronExpression(date: Date, type: 'once' | 'daily' | 'weekly' | 'monthly'): string {
  const min  = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dom  = date.getUTCDate();
  const dow  = date.getUTCDay();

  switch (type) {
    case 'daily':   return `${min} ${hour} * * *`;
    case 'weekly':  return `${min} ${hour} * * ${dow}`;
    case 'monthly': return `${min} ${hour} ${dom} * *`;
    default:        return `${min} ${hour} ${dom} ${date.getUTCMonth() + 1} *`;
  }
}

function nextOccurrence(from: Date, type: IQuiz['scheduleType']): Date {
  const next = new Date(from);
  if (type === 'daily')   next.setDate(next.getDate() + 1);
  if (type === 'weekly')  next.setDate(next.getDate() + 7);
  if (type === 'monthly') next.setMonth(next.getMonth() + 1);
  return next;
}

function cancelReminder(quizId: string): void {
  const t = _reminders.get(quizId);
  if (t) { clearTimeout(t); _reminders.delete(quizId); }
}

function scheduleReminder(quizId: string, quizTitle: string, scheduledAt: Date): void {
  cancelReminder(quizId);
  const ms = scheduledAt.getTime() - Date.now() - REMINDER_MS;
  if (ms <= 0) return; // less than 10 min away — skip reminder
  const handle = setTimeout(() => {
    _reminders.delete(quizId);
    sendQuizReminder(quizId, quizTitle).catch(console.error);
  }, ms);
  _reminders.set(quizId, handle);
  console.log(`🔔 Reminder for "${quizTitle}" scheduled in ${Math.round(ms / 1000 / 60)} min.`);
}

async function activateQuiz(quizId: string): Promise<void> {
  const quiz = await Quiz.findById(quizId);
  if (!quiz || quiz.status !== 'scheduled') return;

  quiz.status    = 'active';
  quiz.startedAt = new Date();
  await quiz.save();
  console.log(`🎯 Quiz "${quiz.title}" (${quizId}) started at ${quiz.startedAt.toISOString()}`);

  // Notify all users that the game is live
  sendQuizStarted(quizId, quiz.title).catch(console.error);

  startGameSession(quizId).catch(console.error);

  const endMs = quiz.durationMinutes * 60 * 1000;
  setTimeout(async () => {
    const q = await Quiz.findById(quizId);
    if (!q || q.status !== 'active') return;
    q.status  = 'completed';
    q.endedAt = new Date();
    await q.save();
    console.log(`✅ Quiz "${q.title}" (${quizId}) completed (timeout).`);

    await rescheduleRecurring(quiz);
  }, endMs);
}

async function rescheduleRecurring(quiz: IQuiz): Promise<void> {
  if (quiz.scheduleType === 'once') {
    cancelQuiz((quiz._id as { toString(): string }).toString());
    return;
  }

  const next = nextOccurrence(quiz.scheduledAt, quiz.scheduleType);
  const quizId = (quiz._id as { toString(): string }).toString();

  if (quiz.endDate && next > quiz.endDate) {
    await Quiz.findByIdAndUpdate(quizId, { status: 'cancelled' });
    cancelQuiz(quizId);
    console.log(`🚫 Quiz "${quiz.title}" reached its end date — cancelled.`);
    return;
  }

  await Quiz.findByIdAndUpdate(quizId, {
    scheduledAt: next,
    status: 'scheduled',
    startedAt: null,
    endedAt: null,
  });
  console.log(`🔁 Quiz "${quiz.title}" rescheduled → ${next.toISOString()}`);

  // Schedule the 10-min reminder for the next occurrence
  scheduleReminder(quizId, quiz.title, next);
}

// ── public API ────────────────────────────────────────────────────────────────

export function scheduleQuiz(quiz: IQuiz): void {
  const id  = (quiz._id as { toString(): string }).toString();
  const now = Date.now();
  const ms  = quiz.scheduledAt.getTime() - now;

  cancelQuiz(id);

  if (ms <= 0) {
    activateQuiz(id).catch(console.error);
    return;
  }

  // Schedule 10-min reminder
  scheduleReminder(id, quiz.title, quiz.scheduledAt);

  const expr = toCronExpression(quiz.scheduledAt, quiz.scheduleType);
  const task = cron.schedule(expr, () => {
    activateQuiz(id).catch(console.error);
  }, { timezone: 'UTC' });

  _tasks.set(id, task);
  console.log(`⏰ Quiz "${quiz.title}" scheduled: cron="${expr}" (${quiz.scheduleType})`);
}

export function cancelQuiz(quizId: string): void {
  const task = _tasks.get(quizId);
  if (task) { task.stop(); _tasks.delete(quizId); }
  cancelReminder(quizId);
}

export async function rehydrateSchedules(): Promise<void> {
  const quizzes = await Quiz.find({ status: 'scheduled' });
  for (const quiz of quizzes) {
    scheduleQuiz(quiz);
  }
  console.log(`🔄 Rehydrated ${quizzes.length} scheduled quiz(zes).`);
}

// ── Stale-game cleanup — runs every 10 minutes ─────────────────────────────────
async function cleanupStaleGames(): Promise<void> {
  const now = new Date();
  const stale = await Quiz.find({ status: 'active', startedAt: { $ne: null } }).lean();

  const expired = stale.filter((q) => {
    if (!q.startedAt) return false;
    const endTime = new Date(q.startedAt.getTime() + q.durationMinutes * 60 * 1000);
    return now > endTime;
  });

  if (expired.length === 0) return;

  for (const q of expired) {
    await Quiz.findByIdAndUpdate(q._id, { status: 'completed', endedAt: now });
    console.log(`🧹 Cleanup: quiz "${q.title}" (${q._id}) force-completed.`);

    // Re-fetch full document to reschedule recurring quizzes
    const full = await Quiz.findById(q._id);
    if (full) await rescheduleRecurring(full);
  }

  console.log(`🧹 Cleanup sweep done — ${expired.length} stale game(s) completed.`);
}

export function startCleanupJob(): void {
  cron.schedule('*/10 * * * *', () => {
    cleanupStaleGames().catch((err) => console.error('[CleanupJob] error:', err));
  }, { timezone: 'UTC' });
  console.log('🕐 Stale-game cleanup job scheduled (every 10 min).');
}

// ── Post-recovery job — runs every 5 minutes ──────────────────────────────────
export function startPostRecoveryJob(): void {
  recoverMissingPosts().catch((err) => console.error('[PostRecoveryJob] boot run error:', err));

  cron.schedule('*/5 * * * *', () => {
    recoverMissingPosts().catch((err) => console.error('[PostRecoveryJob] error:', err));
  }, { timezone: 'UTC' });
  console.log('📝 Post-recovery job scheduled (every 5 min).');
}
