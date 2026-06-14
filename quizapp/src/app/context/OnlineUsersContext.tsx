import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '../store/hooks';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string | undefined)
  ?? (import.meta.env.VITE_API_URL as string | undefined)
  ?? '';

interface OnlineUsersCtx {
  isOnline: (userId: string) => boolean;
}

const Ctx = createContext<OnlineUsersCtx>({ isOnline: () => false });

export function OnlineUsersProvider({ children }: { children: React.ReactNode }) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // Avoid duplicate connections on StrictMode double-invoke
    if (socketRef.current?.connected) return;

    const socket = io(SOCKET_URL || window.location.origin, {
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => console.log('[socket] connected', socket.id));
    socket.on('connect_error', (e) => console.error('[socket] connect_error', e.message));

    socket.on('users:snapshot', ({ onlineIds: ids }: { onlineIds: string[] }) => {
      console.log('[socket] snapshot received', ids.length, 'online');
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

  return (
    <Ctx.Provider value={{ isOnline: (id) => onlineIds.has(id) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useOnlineUsers = () => useContext(Ctx);
