/**
 * Wrapper around fetch that automatically refreshes the JWT access token
 * on 401 responses using the HTTP-only refresh cookie, then retries once.
 */

const API = import.meta.env.VITE_API_URL ?? '';

type TokenRefreshCallback = (newToken: string) => void;

let _getToken: (() => string | null) | null = null;
let _onRefresh: TokenRefreshCallback | null = null;
let _onLogout: (() => void) | null = null;

/** Call once at app startup to wire up Redux store access. */
export function configureApiFetch(
  getToken: () => string | null,
  onRefresh: TokenRefreshCallback,
  onLogout: () => void,
) {
  _getToken  = getToken;
  _onRefresh = onRefresh;
  _onLogout  = onLogout;
}

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // sends the HTTP-only refreshToken cookie
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token = data.accessToken as string | undefined;
    if (token && _onRefresh) {
      _onRefresh(token);
    }
    return token ?? null;
  } catch {
    return null;
  }
}

/** Deduplicated refresh — concurrent calls share one in-flight request. */
function refreshToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function apiFetch(
  input: RequestInfo,
  init: RequestInit = {},
): Promise<Response> {
  const token = _getToken?.();

  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(input, { ...init, headers, credentials: 'include' });

  if (res.status === 401) {
    const newToken = await refreshToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(input, { ...init, headers, credentials: 'include' });
    } else {
      // Refresh also failed — log the user out
      _onLogout?.();
    }
  }

  return res;
}
