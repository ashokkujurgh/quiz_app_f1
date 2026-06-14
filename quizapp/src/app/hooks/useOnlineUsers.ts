import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '../store/hooks';

// Auth service socket URL — same origin when served via nginx proxy
const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string | undefined)
  ?? (import.meta.env.VITE_API_URL as string | undefined)
  ?? '';

export function useOnlineUsers() {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(SOCKET_URL || window.location.origin, {
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('users:snapshot', ({ onlineIds: ids }: { onlineIds: string[] }) => {
      setOnlineIds(new Set(ids));
    });

    socket.on('user:status', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  const isOnline = (userId: string) => onlineIds.has(userId);

  return { isOnline };
}
