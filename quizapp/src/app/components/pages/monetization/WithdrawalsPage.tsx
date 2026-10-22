import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Box, Button, Card, CardContent, Collapse, Pagination, Stack, Typography } from '@mui/material';
import { Payments } from '@mui/icons-material';
import { api, formatDateTime, rupees } from '../../../utils/monetization';
import { StatusChip } from '../../monetization/StatusChip';
import { EmptyState } from '../../shared/EmptyState';

interface W {
  id: string; amountPaise: number; status: string; method: { type: string; label: string };
  rejectionReason: string | null; failureReason: string | null; payoutReference: string | null; paidAt: string | null; createdAt: string;
  history: { status: string; at: string; note: string | null; by: string }[];
}

/** /creator/withdrawals — history with status timeline. */
export function WithdrawalsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<{ items: W[]; total: number; page: number }>({ items: [], total: 0, page: 1 });
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback((page = 1) => api<{ withdrawals: W[]; total: number }>(`/api/creator/withdrawals?page=${page}&limit=10`)
    .then((d) => setData({ items: d.withdrawals, total: d.total, page })).catch((e) => setError(e.message)).finally(() => setLoaded(true)), []);
  useEffect(() => { load(); }, [load]);

  const cancel = async (id: string) => {
    if (!window.confirm('Cancel this withdrawal? The amount goes back to your available balance.')) return;
    try { await api(`/api/creator/withdrawals/${id}/cancel`, { method: 'POST' }); load(data.page); } catch (e) { setError((e as Error).message); }
  };

  return (
    <Box maxWidth={820}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={800}>Withdrawal history</Typography>
        <Button variant="contained" onClick={() => navigate('/creator/withdraw')}>New withdrawal</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loaded && data.items.length === 0 ? (
        <EmptyState icon={Payments} title="No withdrawals yet" description="When you withdraw, you can follow each step here." />
      ) : (
        <Stack spacing={1.5}>
          {data.items.map((w) => (
            <Card key={w.id} variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Box>
                    <Typography fontWeight={800}>{rupees(w.amountPaise)}</Typography>
                    <Typography variant="body2" color="text.secondary">{w.method.label} · requested {formatDateTime(w.createdAt)}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <StatusChip status={w.status} />
                    {['requested', 'under_review'].includes(w.status) && <Button size="small" color="inherit" onClick={() => cancel(w.id)}>Cancel</Button>}
                    <Button size="small" onClick={() => setOpen(open === w.id ? null : w.id)} aria-expanded={open === w.id}>Details</Button>
                  </Stack>
                </Stack>
                {w.rejectionReason && <Alert severity="error" sx={{ mt: 1 }}>Rejected: {w.rejectionReason}. The amount is back in your balance.</Alert>}
                {w.failureReason && <Alert severity="error" sx={{ mt: 1 }}>Payout failed: {w.failureReason}. The amount is back in your balance.</Alert>}
                {w.status === 'paid' && <Typography variant="body2" color="success.main" mt={1}>Paid {formatDateTime(w.paidAt)} · reference {w.payoutReference}</Typography>}
                <Collapse in={open === w.id}>
                  <Stack spacing={0.5} mt={1.5}>
                    {w.history.map((h, i) => (
                      <Typography key={i} variant="body2"><strong>{h.status.replace(/_/g, ' ')}</strong> · {formatDateTime(h.at)}{h.note && ` · ${h.note}`}</Typography>
                    ))}
                  </Stack>
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      {data.total > 10 && <Pagination sx={{ mt: 2 }} count={Math.ceil(data.total / 10)} page={data.page} onChange={(_, p) => load(p)} />}
    </Box>
  );
}
