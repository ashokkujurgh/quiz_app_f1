import { io, Socket } from 'socket.io-client';
import { getToken } from './auth';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;

  socket = io(import.meta.env.VITE_API_URL ?? 'http://localhost:4001', {
    auth: { token: getToken() },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  socket.on('connect',       () => console.log('[socket] connected:', socket!.id));
  socket.on('disconnect',    (r) => console.log('[socket] disconnected:', r));
  socket.on('connect_error', (e) => console.warn('[socket] error:', e.message));

  return socket;
};

export const subscribeToUsers = (userIds: string[]) => {
  if (!socket?.connected || userIds.length === 0) return;
  socket.emit('subscribe:users', userIds);
};

export const unsubscribeFromUsers = (userIds: string[]) => {
  if (!socket?.connected || userIds.length === 0) return;
  socket.emit('unsubscribe:users', userIds);
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
