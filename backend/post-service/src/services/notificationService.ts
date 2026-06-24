import axios from 'axios';
import { getMessaging } from '../config/firebase';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? 'http://auth-service:4001';

async function getAllFcmTokens(): Promise<string[]> {
  try {
    const { data } = await axios.get(`${AUTH_SERVICE_URL}/api/auth/users/fcm-tokens`, { timeout: 5000 });
    return Array.isArray(data.tokens) ? data.tokens : [];
  } catch (err) {
    console.error('[Notification] Failed to fetch all FCM tokens:', (err as Error).message);
    return [];
  }
}

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
    console.error('[Notification] Failed to fetch FCM tokens for users:', (err as Error).message);
    return [];
  }
}

export async function sendNewPostNotification(postId: string, title: string, topic: string): Promise<void> {
  const tokens = await getAllFcmTokens();
  if (!tokens.length) return;

  const body = topic ? `New post in ${topic}` : 'A new post has been published';

  try {
    const messaging = getMessaging();
    for (const chunk of chunkArray(tokens, 500)) {
      await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: { postId, type: 'new_post' },
        android: { priority: 'normal' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
    }
    console.log(`🔔 New post notification sent for "${title}" to ${tokens.length} device(s).`);
  } catch (err) {
    console.error('[Notification] New post send failed:', (err as Error).message);
  }
}

export async function sendCommentNotification(
  postAuthorId: string,
  commenterName: string,
  postTitle: string,
  postId: string,
): Promise<void> {
  const tokens = await getFcmTokensForUsers([postAuthorId]);
  if (!tokens.length) return;

  try {
    const messaging = getMessaging();
    await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: `${commenterName} commented on your post`,
        body: postTitle.length > 80 ? `${postTitle.slice(0, 80)}…` : postTitle,
      },
      data: { postId, type: 'new_comment' },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    });
  } catch (err) {
    console.error('[Notification] Comment notification failed:', (err as Error).message);
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
