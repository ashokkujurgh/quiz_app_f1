import { useEffect } from 'react';
import { useAppSelector } from '../store/hooks';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

const ping = (status: 'online' | 'offline', token: string, keepalive = false) => {
  fetch(`${API_BASE}/api/auth/${status}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    keepalive,
  }).catch(() => {});
};

export const usePresence = () => {
  const token = useAppSelector((s) => s.auth.accessToken);

  useEffect(() => {
    if (!token) return;

    // Mark online immediately on mount / page refresh
    ping('online', token);

    // Mark offline when tab/window closes or refreshes away
    const handleUnload = () => ping('offline', token, true);
    window.addEventListener('beforeunload', handleUnload);

    // Re-mark online only when user comes back to the tab (not offline on hide)
    const handleVisible = () => {
      if (document.visibilityState === 'visible') ping('online', token);
    };
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisible);
      // Only mark offline on actual component unmount (logout/navigation away)
      ping('offline', token);
    };
  }, [token]);
};
