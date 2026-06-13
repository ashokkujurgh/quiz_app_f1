import cron from 'node-cron';
import Quiz, { IQuiz } from '../models/Quiz';

// quizId → cron task handle
const _tasks = new Map<string, cron.ScheduledTask>();

// ── helpers ───────────────────────────────────────────────────────────────────

function toCronExpression(date: Date, type: 'once' | 'daily' | 'weekly' | 'monthly'): string {
  const min  = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dom  = date.getUTCDate();
  const dow  = date.getUTCDay(); // 0=Sun

  switch (type) {
    case 'daily':   return `${min} ${hour} * * *`;
    case 'weekly':  return `${min} ${hour} * * ${dow}`;
    case 'monthly': return `${min} ${hour} ${dom} * *`;
    default:        return `${min} ${hour} ${dom} ${date.getUTCMonth() + 1} *`; // once
  }
}

async function activateQuiz(quizId: string): Promise<void> {
  const quiz = await Quiz.findById(quizId);
  if (!quiz || quiz.status !== 'scheduled') return;

  quiz.status    = 'active';
  quiz.startedAt = new Date();
  await quiz.save();
  console.log(`🎯 Quiz "${quiz.title}" (${quizId}) started at ${quiz.startedAt.toISOString()}`);

  // Schedule auto-end after durationMinutes
  const endMs = quiz.durationMinutes * 60 * 1000;
  setTimeout(async () => {
    const q = await Quiz.findById(quizId);
    if (!q || q.status !== 'active') return;
    q.status  = 'completed';
    q.endedAt = new Date();
    await q.save();
    console.log(`✅ Quiz "${q.title}" (${quizId}) completed.`);

    // Reschedule recurring quizzes unless endDate has been reached
    if (quiz.scheduleType !== 'once') {
      const next = new Date(quiz.scheduledAt);
      if (quiz.scheduleType === 'daily')   next.setDate(next.getDate() + 1);
      if (quiz.scheduleType === 'weekly')  next.setDate(next.getDate() + 7);
      if (quiz.scheduleType === 'monthly') next.setMonth(next.getMonth() + 1);

      const pastEndDate = quiz.endDate && next > quiz.endDate;
      if (pastEndDate) {
        await Quiz.findByIdAndUpdate(quizId, { status: 'cancelled' });
        cancelQuiz(quizId);
        console.log(`🚫 Quiz "${quiz.title}" reached its end date — cancelled.`);
      } else {
        await Quiz.findByIdAndUpdate(quizId, { scheduledAt: next, status: 'scheduled', startedAt: null, endedAt: null });
        console.log(`🔁 Quiz "${quiz.title}" rescheduled → ${next.toISOString()}`);
      }
    } else {
      cancelQuiz(quizId);
    }
  }, endMs);
}

// ── public API ────────────────────────────────────────────────────────────────

export function scheduleQuiz(quiz: IQuiz): void {
  const id  = (quiz._id as { toString(): string }).toString();
  const now = Date.now();
  const ms  = quiz.scheduledAt.getTime() - now;

  cancelQuiz(id); // clear any existing task

  if (ms <= 0) {
    // Already overdue — activate immediately
    activateQuiz(id).catch(console.error);
    return;
  }

  const expr = toCronExpression(quiz.scheduledAt, quiz.scheduleType);

  const task = cron.schedule(expr, () => {
    activateQuiz(id).catch(console.error);
    // cron fires repeatedly for weekly/monthly; for 'once' we self-cancel inside activateQuiz
  }, { timezone: 'UTC' });

  _tasks.set(id, task);
  console.log(`⏰ Quiz "${quiz.title}" scheduled: cron="${expr}" (${quiz.scheduleType})`);
}

export function cancelQuiz(quizId: string): void {
  const task = _tasks.get(quizId);
  if (task) {
    task.stop();
    _tasks.delete(quizId);
  }
}

/** On service restart, reload all scheduled quizzes from DB. */
export async function rehydrateSchedules(): Promise<void> {
  const quizzes = await Quiz.find({ status: 'scheduled' });
  for (const quiz of quizzes) {
    scheduleQuiz(quiz);
  }
  console.log(`🔄 Rehydrated ${quizzes.length} scheduled quiz(zes).`);
}
