import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Avatar, Box, Chip, CircularProgress, FormControlLabel, Pagination, Paper, Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography } from '@mui/material';
import { FactCheck } from '@mui/icons-material';
import { api, ApiError, formatDateTime } from '../../../utils/monetization';
import { EmptyState } from '../../shared/EmptyState';

interface Item {
  id: string; version: number; title: string; coverImage: string; topic: string; subTopic: string | null; wordCount: number;
  creator: { id: string; name: string; username: string }; status: string; submittedAt: string; decidedAt: string | null; assignedReviewerId: string | null; isEdit: boolean;
  screening: { status: string; recommended: string | null; flags: string[]; summary: string };
}

const REC_COLOR: Record<string, 'success' | 'warning' | 'error'> = { approve: 'success', review: 'warning', reject: 'error' };

/** /review — Content Reviewer dashboard. */
export function ReviewQueuePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [mine, setMine] = useState(false);
  const [data, setData] = useState<{ items: Item[]; total: number; page: number } | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback((page = 1) => {
    setData(null);
    api<{ items: Item[]; total: number }>(`/api/moderation/queue?status=${tab}&mine=${mine}&page=${page}&limit=20`)
      .then((d) => { setData({ items: d.items, total: d.total, page }); setError(null); }).catch((e) => setError(e));
  }, [tab, mine]);
  useEffect(() => { load(1); }, [load]);

  if (error?.status === 403) return <Alert severity="warning">This page is for content reviewers. If you were just made a reviewer, log out and back in.</Alert>;

  return (
    <Box>
      <Typography variant="h5" fontWeight={800}>Review queue</Typography>
      <Typography color="text.secondary" mb={2}>Premium posts waiting for a decision. Automatic screening is advice only — you decide.</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="Review status">
          <Tab value="pending" label="Pending" /><Tab value="approved" label="Approved" /><Tab value="rejected" label="Rejected" />
        </Tabs>
        <FormControlLabel control={<Switch checked={mine} onChange={(e) => setMine(e.target.checked)} />} label="Assigned to me" />
      </Stack>
      {!data ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box> : data.items.length === 0 ? (
        <EmptyState icon={FactCheck} title="Nothing here" description={tab === 'pending' ? 'The queue is empty. Nice work!' : 'No decisions yet.'} />
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
          <Table size="small" aria-label="Review queue">
            <TableHead><TableRow><TableCell>Post</TableCell><TableCell>Creator</TableCell><TableCell>Screening</TableCell><TableCell>{tab === 'pending' ? 'Submitted' : 'Decided'}</TableCell></TableRow></TableHead>
            <TableBody>
              {data.items.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/review/${r.id}`)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/review/${r.id}`); }}>
                  <TableCell sx={{ maxWidth: 360 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar variant="rounded" src={r.coverImage} alt="" sx={{ width: 56, height: 32 }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{r.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.topic}{r.subTopic ? ` › ${r.subTopic}` : ''} · {r.wordCount} words{r.isEdit ? ` · edit (v${r.version})` : ''}</Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>{r.creator.name}<Typography variant="caption" display="block" color="text.secondary">@{r.creator.username}</Typography></TableCell>
                  <TableCell>
                    {r.screening.recommended ? <Chip size="small" color={REC_COLOR[r.screening.recommended]} label={`AI: ${r.screening.recommended}`} /> : <Chip size="small" variant="outlined" label={r.screening.status === 'pending' ? 'Screening…' : r.screening.status === 'skipped' ? 'AI off' : 'AI unavailable'} />}
                    {r.screening.flags.length > 0 && <Typography variant="caption" display="block" color="warning.main">{r.screening.flags.join(', ').replace(/_/g, ' ')}</Typography>}
                  </TableCell>
                  <TableCell>{formatDateTime(tab === 'pending' ? r.submittedAt : r.decidedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {data && data.total > 20 && <Pagination sx={{ mt: 2 }} count={Math.ceil(data.total / 20)} page={data.page} onChange={(_, p) => load(p)} />}
    </Box>
  );
}
