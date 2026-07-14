export const API_BASE = 'https://meenzo.com';

type TokenRefreshCallback = (newToken: string, user?: unknown) => void;

let _getToken: (() => string | null) | null = null;
let _onRefresh: TokenRefreshCallback | null = null;
let _onLogout: (() => void) | null = null;

/** Call once at app startup (from a small bridge component) to wire up Redux store access. */
export function configureApiClient(
  getToken: () => string | null,
  onRefresh: TokenRefreshCallback,
  onLogout: () => void,
) {
  _getToken = getToken;
  _onRefresh = onRefresh;
  _onLogout = onLogout;
}

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token = data.accessToken as string | undefined;
    if (token && _onRefresh) {
      _onRefresh(token, data.user);
    }
    return token ?? null;
  } catch {
    return null;
  }
}

/** Deduplicated refresh — concurrent 401s share one in-flight request. */
function refreshToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export interface ApiError extends Error {
  status: number;
  body: any;
}

function makeApiError(status: number, body: any): ApiError {
  const message = body?.message || body?.errors?.[0]?.msg || `Request failed with status ${status}`;
  const err = new Error(message) as ApiError;
  err.status = status;
  err.body = body;
  return err;
}

/**
 * Low-level fetch wrapper: attaches Bearer token, retries once after a 401 via /api/auth/refresh.
 * Does NOT set Content-Type when body is FormData — RN's fetch sets the multipart boundary itself.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = _getToken?.();

  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (!isFormData && init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && path !== '/api/auth/refresh' && path !== '/api/auth/login') {
    const newToken = await refreshToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });
    } else {
      _onLogout?.();
    }
  }

  return res;
}

/** JSON helper: throws ApiError on !ok, otherwise returns parsed body. */
export async function apiJson<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw makeApiError(res.status, body);
  return body as T;
}

export const get = <T = any>(path: string) => apiJson<T>(path, { method: 'GET' });
export const post = <T = any>(path: string, body?: unknown) =>
  apiJson<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined });
export const patch = <T = any>(path: string, body?: unknown) =>
  apiJson<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined });
export const del = <T = any>(path: string) => apiJson<T>(path, { method: 'DELETE' });
export const postForm = <T = any>(path: string, form: FormData) =>
  apiJson<T>(path, { method: 'POST', body: form });
