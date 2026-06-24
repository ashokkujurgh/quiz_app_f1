import axios from 'axios';
import { getMessaging } from '../config/firebase';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? 'http://auth-service:4001';

async function getAllFcmTokens(): Promise<string[]> {
  try {
    const { data } = await axios.get(`${AUTH_SERVICE_URL}/api/auth/users/fcm-tokens`, { timeout: 5000 });
    return Array.isArray(data.tokens) ? data.tokens : [];
  } catch (err) {
    console.error('[Notification] Failed to fetch FCM tokens:', (err as Error).message);
    return [];
  }
}

export async function sendQuizReminder(quizId: string, quizTitle: string): Promise<void> {
  const tokens = await getAllFcmTokens();
  if (!tokens.length) return;

  try {
    const messaging = getMessaging();
    const chunks = chunkArray(tokens, 500);
    for (const chunk of chunks) {
      await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: '⏰ Quiz starting in 10 minutes!',
          body: `"${quizTitle}" goes live soon. Get ready!`,
        },
        data: { quizId, type: 'quiz_reminder' },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
    }
    console.log(`🔔 Reminder sent for "${quizTitle}" to ${tokens.length} device(s).`);
  } catch (err) {
    console.error('[Notification] Reminder send failed:', (err as Error).message);
  }
}

export async function sendQuizStarted(quizId: string, quizTitle: string): Promise<void> {
  const tokens = await getAllFcmTokens();
  if (!tokens.length) return;

  try {
    const messaging = getMessaging();
    const chunks = chunkArray(tokens, 500);
    for (const chunk of chunks) {
      await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: '🎯 Quiz is LIVE now!',
          body: `"${quizTitle}" has started. Join now!`,
        },
        data: { quizId, type: 'quiz_started' },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
    }
    console.log(`🔔 "Quiz started" sent for "${quizTitle}" to ${tokens.length} device(s).`);
  } catch (err) {
    console.error('[Notification] Quiz-started send failed:', (err as Error).message);
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}
