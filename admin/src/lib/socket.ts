import { io, Socket } from 'socket.io-client';
import { getToken } from './auth';

let socket: Socket | null = null;
let pendingSubscriptions: string[] = [];

export const connectSocket = (): Socket => {
  // Return if already connected
  if (socket?.connected) return socket;

  // Disconnect stale socket before creating a new one
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(import.meta.env.VITE_API_URL ?? 'http://localhost:4001', {
    auth: { token: getToken() },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[socket] connected:', socket!.id);
    // Flush any subscriptions that arrived before the socket was ready
    if (pendingSubscriptions.length > 0) {
      socket!.emit('subscribe:users', pendingSubscriptions);
      pendingSubscriptions = [];
    }
  });

  socket.on('disconnect',    (r) => console.log('[socket] disconnected:', r));
  socket.on('connect_error', (e) => console.warn('[socket] error:', e.message));

  return socket;
};

export const subscribeToUsers = (userIds: string[]) => {
  if (userIds.length === 0) return;

  if (socket?.connected) {
    socket.emit('subscribe:users', userIds);
  } else {
    // Queue for when socket connects
    pendingSubscriptions = [...new Set([...pendingSubscriptions, ...userIds])];
  }
};

export const unsubscribeFromUsers = (userIds: string[]) => {
  if (userIds.length === 0) return;
  // Remove from pending queue too
  pendingSubscriptions = pendingSubscriptions.filter((id) => !userIds.includes(id));
  if (socket?.connected) {
    socket.emit('unsubscribe:users', userIds);
  }
};

export const disconnectSocket = () => {
  pendingSubscriptions = [];
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
