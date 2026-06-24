import axios from 'axios';
import { getMessaging } from '../config/firebase';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? 'http://auth-service:4001';

async function getFcmTokensForUsers(userIds: string[]): Promise<string[]> {
  if (!userIds.length) return [];
  try {
    const { data } = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/users/fcm-tokens/batch`,
      { userIds },
      { timeout: 5000 },
    );
    return Array.isArray(data.tokens) ? data.tokens : [];
  } catch (err) {
    console.error('[Notification] Failed to fetch FCM tokens:', (err as Error).message);
    return [];
  }
}

export async function sendMessageNotification(
  recipientIds: string[],
  senderName: string,
  messageText: string,
  conversationId: string,
): Promise<void> {
  const tokens = await getFcmTokensForUsers(recipientIds);
  if (!tokens.length) return;

  const body = messageText.length > 80 ? `${messageText.slice(0, 80)}…` : messageText;

  try {
    const chunks = chunkArray(tokens, 500);
    const messaging = getMessaging();
    for (const chunk of chunks) {
      await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title: senderName, body },
        data: { conversationId, type: 'new_message' },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });
    }
  } catch (err) {
    console.error('[Notification] Message send failed:', (err as Error).message);
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
