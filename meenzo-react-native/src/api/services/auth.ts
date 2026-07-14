import { get, post, patch, postForm } from '../apiClient';
import type { User } from '../../types';

export interface AuthResponse {
  success: boolean;
  accessToken: string;
  user: User;
}

export const login = (email: string, password: string) =>
  post<AuthResponse>('/api/auth/login', { email, password });

export const register = (name: string, email: string, password: string) =>
  post<{ success: boolean; message: string }>('/api/auth/register', { name, email, password });

export const me = () => get<{ success: boolean; user: User }>('/api/auth/me');

export const refresh = () => post<AuthResponse>('/api/auth/refresh', {});

export const logout = () => post<{ success: boolean }>('/api/auth/logout');

export const resendVerification = (email: string) =>
  post<{ success: boolean; message: string }>('/api/auth/resend-verification', { email });

export const forgotPassword = (email: string) =>
  post<{ success: boolean; message: string }>('/api/auth/forgot-password', { email });

export const resetPassword = (token: string, password: string) =>
  post<{ success: boolean; message: string }>('/api/auth/reset-password', { token, password });

export const updateProfile = (patchBody: { name?: string; username?: string; bio?: string }) =>
  patch<{ success: boolean; user: User }>('/api/auth/profile', patchBody);

export const setOnline = () => post<{ success: boolean }>('/api/auth/online', {});
export const setOffline = () => post<{ success: boolean }>('/api/auth/offline', {});

export const uploadAvatar = (form: FormData) =>
  postForm<{ success: boolean; avatarUrl: string; user: User }>('/api/auth/upload/avatar', form);

export const uploadCover = (form: FormData) =>
  postForm<{ success: boolean; coverUrl: string; user: User }>('/api/auth/upload/cover', form);

export const uploadImage = (form: FormData) =>
  postForm<{ success: boolean; url: string }>('/api/auth/upload/image', form);

export const uploadImages = (form: FormData) =>
  postForm<{ success: boolean; urls: string[] }>('/api/auth/upload/images', form);

export const searchUsers = (q: string) =>
  get<{ success: boolean; users: User[] }>(`/api/auth/users/search?q=${encodeURIComponent(q)}`);

export const getUser = (userId: string) =>
  get<{ success: boolean; user: User }>(`/api/auth/users/${userId}`);
