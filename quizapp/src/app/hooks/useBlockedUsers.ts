import { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '../store/hooks';

const API = import.meta.env.VITE_API_URL ?? '';

// Module-level cache so all PostCard instances share one fetch
let cachedIds: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

function fetchBlockedIds(token: string): Promise<string[]> {
  if (cachedIds !== null) return Promise.resolve(cachedIds);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch(`${API}/api/auth/blocked`, {
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((d) => {
      cachedIds = d.success ? (d.blockedUsers as string[]) : [];
      fetchPromise = null;
      return cachedIds!;
    })
    .catch(() => {
      fetchPromise = null;
      return [] as string[];
    });
  return fetchPromise;
}

export function invalidateBlockedCache() {
  cachedIds = null;
  fetchPromise = null;
}

export function useBlockedUsers() {
  const { accessToken } = useAppSelector((s) => s.auth);
  const [blockedIds, setBlockedIds] = useState<string[]>(cachedIds ?? []);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!accessToken) return;
    fetchBlockedIds(accessToken).then((ids) => {
      if (mounted.current) setBlockedIds(ids);
    });
    return () => { mounted.current = false; };
  }, [accessToken]);

  const block = (userId: string, token: string) => {
    cachedIds = [...(cachedIds ?? []), userId];
    setBlockedIds(cachedIds);
    fetch(`${API}/api/auth/block/${userId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  return { blockedIds, block };
}
