import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../api/apiClient';
import { useAppSelector } from '../store/hooks';

interface PresenceCtx {
  isOnline: (userId: string) => boolean;
}

const Ctx = createContext<PresenceCtx>({ isOnline: () => false });

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    if (socketRef.current?.connected) return;

    const socket = io(API_BASE, {
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
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

  return <Ctx.Provider value={{ isOnline: (id) => onlineIds.has(id) }}>{children}</Ctx.Provider>;
}

export const usePresence = () => useContext(Ctx);
