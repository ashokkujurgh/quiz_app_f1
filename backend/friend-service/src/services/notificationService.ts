import axios from 'axios';
import { getMessaging } from '../config/firebase';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? 'http://auth-service:4001';

async function getFcmTokens(userIds: string[]): Promise<string[]> {
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

async function sendToUsers(userIds: string[], notification: { title: string; body: string }, data: Record<string, string>): Promise<void> {
  const tokens = await getFcmTokens(userIds);
  if (!tokens.length) return;
  try {
    await getMessaging().sendEachForMulticast({
      tokens,
      notification,
      data,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    });
  } catch (err) {
    console.error('[Notification] Send failed:', (err as Error).message);
  }
}

export async function sendFriendRequestNotification(toUserId: string, fromUsername: string): Promise<void> {
  await sendToUsers(
    [toUserId],
    { title: 'New Friend Request', body: `${fromUsername} sent you a friend request` },
    { type: 'friend_request', fromUsername },
  );
}

export async function sendFriendAcceptedNotification(toUserId: string, fromUsername: string): Promise<void> {
  await sendToUsers(
    [toUserId],
    { title: 'Friend Request Accepted', body: `${fromUsername} accepted your friend request` },
    { type: 'friend_accepted', fromUsername },
  );
}
