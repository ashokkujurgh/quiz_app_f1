import { get, post, del } from '../apiClient';
import type { FriendUser, FriendRequest, FriendStatus } from '../../types';

export const fetchFriends = (userId?: string) =>
  get<{ success: boolean; data: FriendUser[] }>(`/api/friends${userId ? `?userId=${userId}` : ''}`);

export const fetchIncoming = () =>
  get<{ success: boolean; data: FriendRequest[] }>('/api/friends/requests/incoming');

export const fetchOutgoing = () =>
  get<{ success: boolean; data: FriendRequest[] }>('/api/friends/requests/outgoing');

export const fetchSuggestions = () =>
  get<{ success: boolean; data: FriendUser[] }>('/api/friends/suggestions');

export const fetchStatus = (userId: string) =>
  get<{ success: boolean; status: FriendStatus; requestId?: string }>(`/api/friends/status/${userId}`);

export const sendRequest = (userId: string) =>
  post<{ success: boolean; data: unknown }>(`/api/friends/request/${userId}`, {});

export const acceptRequest = (requestId: string) =>
  post<{ success: boolean; data: unknown }>(`/api/friends/accept/${requestId}`, {});

export const declineRequest = (requestId: string) =>
  post<{ success: boolean }>(`/api/friends/decline/${requestId}`, {});

export const cancelRequest = (userId: string) => del<{ success: boolean }>(`/api/friends/cancel/${userId}`);

export const unfriend = (userId: string) => del<{ success: boolean }>(`/api/friends/unfriend/${userId}`);
