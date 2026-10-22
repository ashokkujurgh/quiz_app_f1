import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert, AlertTitle, Avatar, Box, Button, Card, CardContent, Checkbox, CircularProgress, FormControlLabel, IconButton, Menu, MenuItem,
  Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography, Pagination, Divider,
} from '@mui/material';
import { Add, MoreVert, WorkspacePremium, Article, Gavel } from '@mui/icons-material';
import { api, formatDate, rupees, type Balances, type CreatorStatus } from '../../../utils/monetization';
import { StatusChip } from '../../monetization/StatusChip';
import { BalanceCards } from '../../monetization/BalanceCards';
import { EarningsChart, type SeriesPoint } from '../../monetization/EarningsChart';
import { EmptyState } from '../../shared/EmptyState';

interface Guidelines { version: string; summary: string; rules: string[]; enforcement: string[]; earnings: string[] }
interface Summary { views: { eligibleTotal: number; today: number; thisMonth: number }; balances: Balances; earningPaused: boolean; disclaimer: string }
interface Standing { confirmedViolations: number; level: string; restriction: { active: boolean; until: string | null }; policy: string; violations: { id: string; postTitle: string; category: string; reason: string; confirmedAt: string; consequence: string; status: string; appeal: { status: string } }[] }
export interface PremiumRow {
  id: string; status: string; displayStatus: string; publicPostId: string | null; version: number; createdAt: string; updatedAt: string; publishedAt: string | null;
  draft: { title: string; coverImage: string | null }; lastRejectionReason: string | null;
  stats: { eligibleViews: number; earnedPaise: number; approvedPaise: number; estimatedPaise: number; lastViewAt: string | null } | null;
}

// ── Onboarding ────────────────────────────────────────────────────────────────
export function GuidelinesList({ g }: { g: Guidelines }) {
  return (
    <Box>
      <Typography mb={1}>{g.summary}</Typography>
      {[['Content rules', g.rules], ['How review works', g.enforcement], ['Earnings', g.earnings]].map(([title, items]) => (
        <Box key={title as string} mb={1.5}>
          <Typography fontWeight={700} mb={0.5}>{title as string}</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>{(items as string[]).map((r) => <li key={r}><Typography variant="body2">{r}</Typography></li>)}</Box>
        </Box>
      ))}
    </Box>
  );
}

function Onboarding({ status, onDone }: { status: CreatorStatus; onDone: () => void }) {
  const navigate = useNavigate();
  const [g, setG] = useState<Guidelines | null>(null);
  const [name, setName] = useState(status.profile?.displayName ?? '');
  const [bio, setBio] = useState(status.profile?.bio ?? '');
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api<{ guidelines: Guidelines }>('/api/creator/guidelines').then((d) => setG(d.guidelines)).catch((e) => setError(e.message)); }, []);

  const submit = async () => {
    setBusy(true); setError('');
    try {
      await api('/api/creator/apply', { method: 'POST', json: { displayName: name, bio, acceptGuidelines: true, guidelinesVersion: g!.version } });
      onDone();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Box maxWidth={760}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}><WorkspacePremium color="warning" /><Typography variant="h5" fontWeight={800}>Become a Meenzo creator</Typography></Stack>
      <Typography color="text.secondary" mb={2}>Publish premium study posts that everyone can read, and earn from eligible views.</Typography>
      {!status.isCreatorPlan && (
        <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => navigate('/plans?highlight=creator')}>Get Creator Premium</Button>}>
          Creator tools need the Creator Premium plan (₹99 for 30 days).
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Card variant="outlined" sx={{ mb: 2 }}><CardContent>{g ? <GuidelinesList g={g} /> : <CircularProgress size={24} />}</CardContent></Card>
      {status.isCreatorPlan && g && (
        <Card variant="outlined"><CardContent>
          <Stack spacing={2}>
            <TextField label="Display name" value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 60 }} helperText="Shown on your premium posts" required />
            <TextField label="Short bio (optional)" value={bio} onChange={(e) => setBio(e.target.value)} multiline minRows={2} inputProps={{ maxLength: 300 }} helperText={`${bio.length}/300`} />
            <FormControlLabel control={<Checkbox checked={accept} onChange={(e) => setAccept(e.target.checked)} />} label="I have read and accept the creator guidelines" />
            <Button variant="contained" disabled={!accept || name.trim().length < 2 || busy} onClick={submit}>{busy ? 'Saving…' : status.hasProfile ? 'Accept updated guidelines' : 'Start creating'}</Button>
          </Stack>
        </CardContent></Card>
      )}
    </Box>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function PostActions({ row, onChanged }: { row: PremiumRow; onChanged: () => void }) {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const run = async (path: string, confirmText: string) => {
    setAnchor(null);
    if (!window.confirm(confirmText)) return;
    try { await api(`/api/posts/premium/${row.id}/${path}`, { method: 'POST' }); onChanged(); } catch (e) { window.alert((e as Error).message); }
  };
  return (
    <>
      <IconButton aria-label={`Actions for ${row.draft.title || 'untitled post'}`} onClick={(e) => setAnchor(e.currentTarget)}><MoreVert /></IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {row.publicPostId && row.status === 'published' && <MenuItem onClick={() => navigate(`/posts/${row.publicPostId}`)}>View live post</MenuItem>}
        <MenuItem onClick={() => navigate(`/creator/posts/${row.id}`)}>{row.status === 'draft' && row.displayStatus !== 'in_review' ? 'Edit draft' : row.displayStatus.includes('rejected') ? 'Edit and resubmit' : 'Edit'}</MenuItem>
        {row.publicPostId && <MenuItem onClick={() => navigate(`/creator/posts/${row.id}/analytics?post=${row.publicPostId}`)}>Analytics</MenuItem>}
        {row.status === 'published' && <MenuItem onClick={() => run('unpublish', 'Unpublish this post? It disappears from Meenzo; your earnings history stays.')}>Unpublish</MenuItem>}
        {row.status === 'unpublished' && <MenuItem onClick={() => run('republish', 'Publish this post again (last approved version)?')}>Republish</MenuItem>}
      </Menu>
    </>
  );
}

function Dashboard({ status }: { status: CreatorStatus }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [standing, setStanding] = useState<Standing | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [posts, setPosts] = useState<{ items: PremiumRow[]; total: number; page: number; statsAvailable: boolean }>({ items: [], total: 0, page: 1, statsAvailable: true });
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  const loadPosts = useCallback(async (page = 1) => {
    const q = new URLSearchParams({ page: String(page), limit: '10', ...(filter !== 'all' ? { status: filter } : {}) });
    const d = await api<{ posts: PremiumRow[]; total: number; statsAvailable: boolean }>(`/api/posts/premium/mine?${q}`);
    setPosts({ items: d.posts, total: d.total, page, statsAvailable: d.statsAvailable });
  }, [filter]);

  useEffect(() => {
    Promise.all([
      api<{ summary: Summary }>('/api/creator/earnings/summary').then((d) => setSummary(d.summary)),
      api<{ standing: Standing }>('/api/posts/premium/standing').then((d) => setStanding(d.standing)),
      api<{ analytics: { series: SeriesPoint[] } }>('/api/creator/earnings/analytics').then((d) => setSeries(d.analytics.series)),
    ]).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { loadPosts(1).catch((e) => setError(e.message)); }, [loadPosts]);

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Creator dashboard</Typography>
          <Typography color="text.secondary">{status.profile?.displayName}{status.planEndsAt && ` · Creator Premium until ${formatDate(status.planEndsAt)}`}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/creator/earnings')}>Earnings</Button>
          <Button variant="outlined" onClick={() => navigate('/creator/withdraw')}>Withdraw</Button>
          <Button variant="contained" startIcon={<Add />} disabled={!status.canCreatePremium} onClick={() => navigate('/creator/posts/new')}>New premium post</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!status.canCreatePremium && (
        <Alert severity="warning" sx={{ mb: 2 }} action={!status.isCreatorPlan ? <Button color="inherit" size="small" onClick={() => navigate('/plans?highlight=creator')}>Renew</Button> : undefined}>
          <AlertTitle>New premium posts are paused</AlertTitle>
          {status.reasons.join(' ')} Your published posts stay live and your balance and history are kept.
        </Alert>
      )}
      {summary?.earningPaused && <Alert severity="info" sx={{ mb: 2 }}>Views aren't earning while your Creator Premium plan is inactive. Earning resumes when you renew.</Alert>}
      {standing && standing.confirmedViolations > 0 && (
        <Alert severity={standing.restriction.active ? 'error' : 'warning'} icon={<Gavel />} sx={{ mb: 2 }}>
          <AlertTitle>{standing.restriction.active ? `Premium submissions blocked until ${formatDate(standing.restriction.until)}` : `Warning ${Math.min(2, standing.confirmedViolations)} of 2`}</AlertTitle>
          {standing.confirmedViolations} confirmed policy violation{standing.confirmedViolations === 1 ? '' : 's'}. {standing.policy}{' '}
          <Button size="small" color="inherit" onClick={() => navigate('/creator/standing')}>Details & appeals</Button>
        </Alert>
      )}

      {summary && (
        <>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, mb: 1.5 }}>
            {[
              ['Published premium posts', posts.items.length ? String(posts.items.filter((p) => p.status === 'published').length) + (posts.total > posts.items.length ? '+' : '') : '0'],
              ['Eligible views', summary.views.eligibleTotal.toLocaleString('en-IN')],
              ['Views today', summary.views.today.toLocaleString('en-IN')],
              ['Views this month', summary.views.thisMonth.toLocaleString('en-IN')],
            ].map(([label, value]) => (
              <Card key={label} variant="outlined"><CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="h6" fontWeight={800}>{value}</Typography>
              </CardContent></Card>
            ))}
          </Box>
          <BalanceCards balances={summary.balances} />
          <Typography variant="caption" color="text.secondary" display="block" mt={1} mb={2}>{summary.disclaimer}</Typography>
        </>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography fontWeight={700} mb={1}>Last 30 days</Typography>
          <EarningsChart series={series} />
        </CardContent>
      </Card>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight={700}>My premium posts</Typography>
      </Stack>
      <Tabs value={filter} onChange={(_, v) => setFilter(v)} variant="scrollable" sx={{ mb: 1 }} aria-label="Filter posts by status">
        {[['all', 'All'], ['draft', 'Drafts'], ['in_review', 'In review'], ['rejected', 'Rejected'], ['published', 'Published'], ['unpublished', 'Unpublished']].map(([v, l]) => <Tab key={v} value={v} label={l} />)}
      </Tabs>
      {!posts.statsAvailable && <Alert severity="info" sx={{ mb: 1 }}>View and earnings numbers are temporarily unavailable.</Alert>}
      {posts.items.length === 0 ? (
        <EmptyState icon={Article} title="No premium posts here yet" description="Write your first premium post. Every post is reviewed by a person before it goes live." actionLabel={status.canCreatePremium ? 'New premium post' : undefined} onAction={() => navigate('/creator/posts/new')} />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="My premium posts">
            <TableHead><TableRow>
              <TableCell>Post</TableCell><TableCell>Status</TableCell><TableCell>Created</TableCell><TableCell>Published</TableCell>
              <TableCell align="right">Views</TableCell><TableCell align="right">Estimated</TableCell><TableCell align="right">Approved</TableCell><TableCell>Updated</TableCell><TableCell />
            </TableRow></TableHead>
            <TableBody>
              {posts.items.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar variant="rounded" src={p.draft.coverImage ?? undefined} alt="" sx={{ width: 56, height: 32 }}><Article /></Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{p.draft.title || 'Untitled draft'}</Typography>
                        {p.lastRejectionReason && p.displayStatus.includes('rejected') && <Typography variant="caption" color="error" noWrap display="block">{p.lastRejectionReason}</Typography>}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell><StatusChip status={p.displayStatus} /></TableCell>
                  <TableCell>{formatDate(p.createdAt)}</TableCell>
                  <TableCell>{formatDate(p.publishedAt)}</TableCell>
                  <TableCell align="right">{p.stats ? p.stats.eligibleViews.toLocaleString('en-IN') : '—'}</TableCell>
                  <TableCell align="right">{p.stats ? rupees(p.stats.earnedPaise) : '—'}</TableCell>
                  <TableCell align="right">{p.stats ? rupees(p.stats.approvedPaise) : '—'}</TableCell>
                  <TableCell>{formatDate(p.updatedAt)}</TableCell>
                  <TableCell align="right"><PostActions row={p} onChanged={() => loadPosts(posts.page)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {posts.total > 10 && <Pagination sx={{ mt: 2 }} count={Math.ceil(posts.total / 10)} page={posts.page} onChange={(_, p) => loadPosts(p)} />}
      <Divider sx={{ my: 3 }} />
      <Button size="small" onClick={() => navigate('/creator/guidelines')}>Creator guidelines</Button>
    </Box>
  );
}

/** /creator — onboarding for new creators, the dashboard for everyone who has onboarded. */
export function CreatorHubPage() {
  const [status, setStatus] = useState<CreatorStatus | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => api<{ creator: CreatorStatus }>('/api/creator/me').then((d) => setStatus(d.creator)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!status) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!status.hasProfile || (status.isCreatorPlan && status.reasons.some((r) => r.includes('guidelines were updated')))) return <Onboarding status={status} onDone={load} />;
  return <Dashboard status={status} />;
}

/** /creator/guidelines */
export function CreatorGuidelinesPage() {
  const [g, setG] = useState<Guidelines | null>(null);
  useEffect(() => { api<{ guidelines: Guidelines }>('/api/creator/guidelines').then((d) => setG(d.guidelines)).catch(() => undefined); }, []);
  return (
    <Box maxWidth={760}>
      <Typography variant="h5" fontWeight={800} mb={2}>Creator guidelines</Typography>
      {g ? <Card variant="outlined"><CardContent><GuidelinesList g={g} /><Typography variant="caption" color="text.secondary">Version {g.version}</Typography></CardContent></Card> : <CircularProgress />}
    </Box>
  );
}
