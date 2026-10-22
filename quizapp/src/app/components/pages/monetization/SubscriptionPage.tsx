import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Paper, Pagination,
} from '@mui/material';
import { ReceiptLong } from '@mui/icons-material';
import { api, formatDate, formatDateTime, rupees, type Entitlements } from '../../../utils/monetization';
import { StatusChip } from '../../monetization/StatusChip';
import { QuotaBanner } from '../../monetization/QuotaBanner';
import { EmptyState } from '../../shared/EmptyState';

interface Sub { id: string; planCode: string; status: string; startsAt: string; endsAt: string; source: string; bonusDays: number; renewalReminders: boolean }
interface Pay { id: string; planCode: string; amountPaise: number; status: string; method: string | null; paymentRef: string | null; refundedPaise: number; failureReason: string | null; paidAt: string | null; createdAt: string }

const PLAN_NAMES: Record<string, string> = { premium: 'Premium', creator: 'Creator Premium' };

export function SubscriptionPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<{ entitlements: Entitlements; status: 'active' | 'expired' | 'free'; daysLeft: number; history: Sub[]; openPayment: Pay | null } | null>(null);
  const [payments, setPayments] = useState<{ items: Pay[]; total: number; page: number }>({ items: [], total: 0, page: 1 });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async (page = 1) => {
    try {
      const [s, p] = await Promise.all([
        api<typeof data & object>('/api/billing/subscription'),
        api<{ payments: Pay[]; total: number }>(`/api/billing/payments?page=${page}&limit=10`),
      ]);
      setData(s as NonNullable<typeof data>);
      setPayments({ items: p.payments, total: p.total, page });
    } catch (e) { setError((e as Error).message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stopReminders = async () => {
    setConfirm(false);
    try {
      const r = await api<{ message: string }>('/api/billing/subscription/cancel', { method: 'POST' });
      setNotice(r.message);
      load(payments.page);
    } catch (e) { setError((e as Error).message); }
  };

  if (!data && !error) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const ent = data?.entitlements;
  return (
    <Box>
      <Typography variant="h5" fontWeight={800} mb={2}>My subscription</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      {ent && data && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="overline" color="text.secondary">Current plan</Typography>
                <Typography variant="h5" fontWeight={800}>{ent.plan.name}</Typography>
                {ent.subscription ? (
                  <Typography color="text.secondary">
                    Started {formatDate(ent.subscription.startsAt)} · ends {formatDate(ent.subscription.endsAt)} ({data.daysLeft} day{data.daysLeft === 1 ? '' : 's'} left)
                  </Typography>
                ) : data.status === 'expired' ? (
                  <Typography color="warning.main">Your paid plan has expired. You're on the Free plan — your posts, quizzes and creator history are all kept.</Typography>
                ) : (
                  <Typography color="text.secondary">Free forever. Upgrade any time for unlimited quizzes.</Typography>
                )}
                {ent.upcoming.map((u) => (
                  <Typography key={u.id} variant="body2" color="text.secondary">Next: {PLAN_NAMES[u.planCode]} {formatDate(u.startsAt)} – {formatDate(u.endsAt)}</Typography>
                ))}
              </Box>
              <Stack spacing={1} sx={{ minWidth: 200 }}>
                <Button variant="contained" onClick={() => navigate('/plans')}>{ent.isPaid ? 'Renew or upgrade' : 'See plans'}</Button>
                {ent.isPaid && <Button variant="text" color="inherit" onClick={() => setConfirm(true)}>Turn off renewal reminders</Button>}
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>One-time payments — nothing is charged automatically.</Typography>
          </CardContent>
        </Card>
      )}

      {data?.openPayment && (
        <Alert severity="info" sx={{ mb: 2 }}>
          A payment of {rupees(data.openPayment.amountPaise)} started {formatDateTime(data.openPayment.createdAt)} is not finished yet. If you paid, it will be confirmed automatically.
        </Alert>
      )}

      <QuotaBanner />

      <Typography variant="h6" fontWeight={700} mb={1}>Payment history</Typography>
      {payments.items.length === 0 ? (
        <EmptyState icon={ReceiptLong} title="No payments yet" description="Your receipts will appear here." />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="Payment history">
              <TableHead>
                <TableRow><TableCell>Date</TableCell><TableCell>Plan</TableCell><TableCell align="right">Amount</TableCell><TableCell>Status</TableCell><TableCell>Reference</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {payments.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDateTime(p.paidAt ?? p.createdAt)}</TableCell>
                    <TableCell>{PLAN_NAMES[p.planCode] ?? p.planCode}</TableCell>
                    <TableCell align="right">{rupees(p.amountPaise)}{p.refundedPaise > 0 && <Typography variant="caption" display="block" color="info.main">refunded {rupees(p.refundedPaise)}</Typography>}</TableCell>
                    <TableCell><StatusChip status={p.status} />{p.failureReason && <Typography variant="caption" display="block" color="error">{p.failureReason}</Typography>}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{p.paymentRef ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {payments.total > 10 && <Pagination sx={{ mt: 2 }} count={Math.ceil(payments.total / 10)} page={payments.page} onChange={(_, p) => load(p)} />}
        </>
      )}

      {data?.history.length ? (
        <>
          <Typography variant="h6" fontWeight={700} mt={3} mb={1}>Plan periods</Typography>
          <Stack spacing={1}>
            {data.history.map((s) => (
              <Stack key={s.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <StatusChip status={s.status} />
                <Typography variant="body2">{PLAN_NAMES[s.planCode]} · {formatDate(s.startsAt)} – {formatDate(s.endsAt)}{s.bonusDays > 0 && ` (+${s.bonusDays} days from upgrade)`}{s.source === 'admin_grant' && ' · granted by Meenzo'}</Typography>
              </Stack>
            ))}
          </Stack>
        </>
      ) : null}

      <Dialog open={confirm} onClose={() => setConfirm(false)}>
        <DialogTitle>Turn off renewal reminders?</DialogTitle>
        <DialogContent><DialogContentText>Your plan stays active until its end date. Nothing renews automatically either way.</DialogContentText></DialogContent>
        <DialogActions><Button onClick={() => setConfirm(false)}>Keep reminders</Button><Button onClick={stopReminders} color="warning">Turn off</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
