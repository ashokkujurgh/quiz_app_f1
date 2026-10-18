import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '../store/hooks';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string | undefined)
  ?? (import.meta.env.VITE_API_URL as string | undefined)
  ?? '';

// ── Online-users store ────────────────────────────────────────────────────────
// The set of online user ids lives outside React state, in a tiny store that
// components subscribe to. A status event then re-renders only the components
// that read that user (useIsOnline), instead of every consumer of a context
// value that changed on every event.

type Listener = () => void;

class OnlineStore {
  private ids = new Set<string>();
  private version = 0;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  has = (id: string) => this.ids.has(id);
  getVersion = () => this.version;

  replace(ids: string[]) { this.ids = new Set(ids); this.emit(); }
  set(id: string, online: boolean) {
    if (online === this.ids.has(id)) return;
    if (online) this.ids.add(id); else this.ids.delete(id);
    this.emit();
  }
  clear() { if (this.ids.size) { this.ids = new Set(); this.emit(); } }

  private emit() { this.version++; this.listeners.forEach((l) => l()); }
}

// The context value is the store itself — created once, so it never changes
// and never re-renders consumers on its own.
const Ctx = createContext<OnlineStore | null>(null);

export function OnlineUsersProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => new OnlineStore());
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) { store.clear(); return; }

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
      store.replace(ids);
    });

    socket.on('user:status', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      store.set(userId, isOnline);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, store]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

const fallbackStore = new OnlineStore();
const useStore = () => useContext(Ctx) ?? fallbackStore;

/** Is this one user online? Re-renders only when *this* user's status changes. */
export function useIsOnline(userId: string | null | undefined): boolean {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, () => (userId ? store.has(userId) : false));
}

/**
 * isOnline(id) for components that check many users at once (comment lists,
 * conversation lists). Re-renders on any status change — prefer useIsOnline
 * for a single user.
 */
export function useOnlineUsers() {
  const store = useStore();
  const version = useSyncExternalStore(store.subscribe, store.getVersion);
  // new function identity per status change, so memoized children relying on it update
  const isOnline = useCallback((id: string) => store.has(id), [store, version]); // eslint-disable-line react-hooks/exhaustive-deps
  return { isOnline };
}
