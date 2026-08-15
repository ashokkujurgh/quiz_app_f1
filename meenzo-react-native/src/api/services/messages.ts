import { get, post, patch, del, postForm } from '../apiClient';
import type { Conversation, Message } from '../../types';

export const fetchConversations = () =>
  get<{ success: boolean; data: Conversation[] }>('/api/messages/conversations');

export const openConversation = (userId: string) =>
  post<{ success: boolean; data: Conversation }>(`/api/messages/conversations/${userId}`, {});

export const fetchMessages = (conversationId: string, page = 1, limit = 30) =>
  get<{ success: boolean; data: Message[] }>(
    `/api/messages/conversations/${conversationId}?page=${page}&limit=${limit}`,
  );

export const markRead = (conversationId: string) =>
  post<{ success: boolean }>(`/api/messages/conversations/${conversationId}/read`, {});

export const sendMessage = (conversationId: string, text?: string, imageUrl?: string) =>
  post<{ success: boolean; data: Message }>(`/api/messages/conversations/${conversationId}/messages`, {
    text,
    imageUrl,
  });

export const uploadChatImage = (form: FormData) =>
  postForm<{ success: boolean; url: string }>('/api/messages/upload', form);

// ── Groups ────────────────────────────────────────────────────

export const createGroup = (name: string, participantIds: string[]) =>
  post<{ success: boolean; data: Conversation }>('/api/messages/groups', { name, participantIds });

export const fetchGroupDetails = (id: string) =>
  get<{ success: boolean; data: Conversation }>(`/api/messages/groups/${id}`);

export const updateGroupName = (id: string, name: string) =>
  patch<{ success: boolean; data: Conversation }>(`/api/messages/groups/${id}`, { name });

export const updateGroupIcon = (id: string, form: FormData) =>
  postForm<{ success: boolean; data: Conversation }>(`/api/messages/groups/${id}/icon`, form);

export const addGroupMembers = (id: string, userIds: string[]) =>
  post<{ success: boolean; data: Conversation }>(`/api/messages/groups/${id}/members`, { userIds });

export const removeGroupMember = (id: string, userId: string) =>
  del<{ success: boolean; data: Conversation }>(`/api/messages/groups/${id}/members/${userId}`);

export const leaveGroup = (id: string) =>
  post<{ success: boolean; data: Conversation | { deleted: true } }>(`/api/messages/groups/${id}/leave`, {});

export const makeGroupAdmin = (id: string, userId: string) =>
  post<{ success: boolean; data: Conversation }>(`/api/messages/groups/${id}/admins/${userId}`, {});

export const removeGroupAdmin = (id: string, userId: string) =>
  del<{ success: boolean; data: Conversation }>(`/api/messages/groups/${id}/admins/${userId}`);

export const deleteGroup = (id: string) => del<{ success: boolean }>(`/api/messages/groups/${id}`);
