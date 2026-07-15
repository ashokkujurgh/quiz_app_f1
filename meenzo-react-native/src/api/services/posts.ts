import { get, post, patch, del } from '../apiClient';
import type { Post, Comment } from '../../types';

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const fetchFeed = (params: { topic?: string; subTopic?: string; page?: number; limit?: number; q?: string } = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return get<{ success: boolean; posts: Post[]; pagination: Pagination }>(`/api/posts${suffix}`);
};

export const fetchPost = (id: string) => get<{ success: boolean; post: Post }>(`/api/posts/${id}`);

export const fetchUserPosts = (userId: string, page = 1, limit = 20) =>
  get<{ success: boolean; posts: Post[] }>(`/api/posts/user/${userId}?page=${page}&limit=${limit}`);

export interface CreatePostBody {
  title?: string;
  content: string;
  image?: string;
  images?: string[];
  topic: string;
  subTopic?: string;
  authorName: string;
  authorUsername?: string;
  authorAvatar?: string | null;
  quizResult?: Post['quizResult'];
}

export const createPost = (body: CreatePostBody) => post<{ success: boolean; post: Post }>('/api/posts', body);

export const updatePost = (id: string, body: Partial<CreatePostBody>) =>
  patch<{ success: boolean; post: Post }>(`/api/posts/${id}`, body);

export const deletePost = (id: string) => del<{ success: boolean }>(`/api/posts/${id}`);

export const toggleLike = (id: string) => post<{ success: boolean; liked: boolean; likes: number }>(`/api/posts/${id}/like`, {});

export const toggleSave = (id: string) => post<{ success: boolean; saved: boolean }>(`/api/posts/${id}/save`, {});

export const fetchComments = (id: string) =>
  get<{ success: boolean; comments: Comment[] }>(`/api/posts/${id}/comments`);

export const updateComment = (postId: string, commentId: string, content: string) =>
  patch<{ success: boolean; comment: Comment }>(`/api/posts/${postId}/comments/${commentId}`, { content });

export const deleteComment = (postId: string, commentId: string) =>
  del<{ success: boolean }>(`/api/posts/${postId}/comments/${commentId}`);

export const addComment = (
  id: string,
  content: string,
  author: { name: string; username?: string; avatar?: string | null },
) =>
  post<{ success: boolean; comment: Comment }>(`/api/posts/${id}/comments`, {
    content,
    authorName: author.name,
    authorUsername: author.username ?? 'user',
    authorAvatar: author.avatar ?? null,
  });
