import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { useLocation, useNavigate, useRouteError, isRouteErrorResponse } from 'react-router';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline, Refresh, Home } from '@mui/icons-material';

// ── Stale-chunk recovery ──────────────────────────────────────────────────────
// After a deploy, a tab opened earlier asks for page chunks that no longer exist.
// A single automatic reload fetches the new build; the flag stops a reload loop.
const RELOAD_FLAG = 'meenzo.chunkReloadAt';

function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(msg);
}

/** Reloads once for a stale chunk. Returns true when a reload was started. */
function reloadForNewBuild(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
    if (Date.now() - last < 10_000) return false;   // just reloaded — show the error instead
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch { /* storage blocked — still worth one reload */ }
  window.location.reload();
  return true;
}

// ── Fallback UI ───────────────────────────────────────────────────────────────
function ErrorFallback({ error, onRetry, fullPage = false }: { error: unknown; onRetry?: () => void; fullPage?: boolean }) {
  const chunk   = isChunkLoadError(error);
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight={fullPage ? '100vh' : '60vh'} p={3}
      sx={{ bgcolor: fullPage ? 'background.default' : undefined }}>
      <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, maxWidth: 480, width: '100%', textAlign: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <ErrorOutline sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={800} mb={1}>
          {chunk ? 'A new version is available' : 'Something went wrong'}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {chunk
            ? 'Meenzo was updated while this page was open. Reload to get the latest version.'
            : 'This page ran into a problem. Try again, or head back home.'}
        </Typography>
        {import.meta.env.DEV && message && (
          <Typography variant="caption" color="text.disabled" component="pre"
            sx={{ mb: 3, p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'left', overflowX: 'auto', display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message}
          </Typography>
        )}
        <Box display="flex" gap={1.5} justifyContent="center" flexWrap="wrap">
          {onRetry && !chunk ? (
            <Button variant="contained" startIcon={<Refresh />} onClick={onRetry}>Try again</Button>
          ) : (
            <Button variant="contained" startIcon={<Refresh />} onClick={() => window.location.reload()}>Reload page</Button>
          )}
          <Button variant="outlined" startIcon={<Home />} onClick={() => { window.location.href = '/home'; }}>Go home</Button>
        </Box>
      </Paper>
    </Box>
  );
}

// ── Class boundary ────────────────────────────────────────────────────────────
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** When this value changes (e.g. the route), a caught error is cleared. */
  resetKey?: unknown;
  fullPage?: boolean;
}

interface State { error: unknown; hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { error, hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (reloadForNewBuild(error)) return;
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) this.reset();
  }

  reset = () => this.setState({ error: null, hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return <ErrorFallback error={this.state.error} onRetry={this.reset} fullPage={this.props.fullPage} />;
  }
}

/** Per-page boundary: a crash replaces only the page (navbar and menus keep working) and clears on navigation. */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}

/** Shown for URLs that match no route. */
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh" p={3} sx={{ bgcolor: 'background.default' }}>
      <Box textAlign="center">
        <Typography variant="h2" fontWeight={800} color="primary">404</Typography>
        <Typography variant="h6" fontWeight={700} mb={1}>Page not found</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>The page you're looking for doesn't exist or has moved.</Typography>
        <Button variant="contained" startIcon={<Home />} onClick={() => navigate('/home')}>Go home</Button>
      </Box>
    </Box>
  );
}

/** Router `errorElement`: catches anything the page boundaries don't (layouts, route errors). */
export function RouteErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  useEffect(() => {
    if (notFound || reloadForNewBuild(error)) return;
    console.error('[RouteError]', error);
  }, [error, notFound]);

  if (notFound) return <NotFoundPage />;
  return <ErrorFallback error={error} fullPage />;
}
