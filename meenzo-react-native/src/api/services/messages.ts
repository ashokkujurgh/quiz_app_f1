import { get, post, postForm } from '../apiClient';
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
