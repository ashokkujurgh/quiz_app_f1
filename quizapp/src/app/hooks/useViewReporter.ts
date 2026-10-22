import { useEffect } from 'react';
import { apiFetch } from '../utils/apiFetch';

const API = import.meta.env.VITE_API_URL ?? '';
const DWELL_MS = 5500; // a little over the server's minimum reading time

/**
 * Sends a premium post's signed view token back once the post has been visible for a few
 * seconds. The page never sends a count — the server decides whether the view is eligible.
 * The timer pauses while the tab is hidden.
 */
export function useViewReporter(postId: string | undefined, viewToken: string | null): void {
  useEffect(() => {
    if (!postId || !viewToken) return;
    let visibleMs = 0;
    let last = document.visibilityState === 'visible' ? Date.now() : 0;
    let sent = false;

    const tick = () => {
      if (sent) return;
      const now = Date.now();
      if (last) visibleMs += now - last;
      last = document.visibilityState === 'visible' ? now : 0;
      if (visibleMs >= DWELL_MS) {
        sent = true;
        apiFetch(`${API}/api/posts/${postId}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ viewToken }),
          keepalive: true,
        }).catch(() => undefined);
      }
    };
    const timer = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [postId, viewToken]);
}
