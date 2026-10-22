import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Alert, AlertTitle, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography, Paper,
} from '@mui/material';
import { Check, Close, WorkspacePremium } from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { useAppSelector } from '../../../store/hooks';
import { api, ApiError, formatDate, idempotencyKey, rupees, type Entitlements, type Plan, type PlanCode } from '../../../utils/monetization';
import { loadRazorpay } from '../../../utils/razorpay';

type Outcome =
  | { kind: 'success'; plan: string; endsAt?: string }
  | { kind: 'pending'; paymentId: string }
  | { kind: 'failed'; message: string }
  | { kind: 'cancelled' }
  | null;

interface CheckoutPayload { paymentId: string; keyId: string; orderId: string; amountPaise: number; currency: string; planName: string; notice: string; prefill: { name: string; email: string } }

const ROWS: { label: string; free: string | boolean; premium: string | boolean; creator: string | boolean }[] = [
  { label: 'Read all posts, incl. premium posts', free: true, premium: true, creator: true },
  { label: 'Write regular posts', free: 'Unlimited', premium: 'Unlimited', creator: 'Unlimited' },
  { label: 'Practice tests', free: 'Unlimited', premium: 'Unlimited', creator: 'Unlimited' },
  { label: 'Daily quiz & game plays', free: '1 per day', premium: 'Unlimited', creator: 'Unlimited' },
  { label: 'Create quizzes', free: '1 per day', premium: 'Unlimited', creator: 'Unlimited' },
  { label: 'Accept game invites', free: 'Uses your daily play', premium: 'Unlimited', creator: 'Unlimited' },
  { label: 'Creator dashboard & premium posts', free: false, premium: false, creator: true },
  { label: 'Earn from eligible views (₹0.10 each)', free: false, premium: false, creator: 'Eligible*' },
  { label: 'Withdraw earnings (min ₹100)', free: false, premium: false, creator: true },
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check color="success" aria-label="Included" />;
  if (v === false) return <Close sx={{ color: 'text.disabled' }} aria-label="Not included" />;
  return <Typography variant="body2">{v}</Typography>;
}

export function PlansPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const highlight = params.get('highlight') as PlanCode | null;
  const token = useAppSelector((s) => s.auth.accessToken);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [ent, setEnt] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<PlanCode | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const p = await api<{ plans: Plan[]; paymentsEnabled: boolean }>('/api/billing/plans');
      setPlans(p.plans);
      setEnabled(p.paymentsEnabled);
      if (token) setEnt((await api<{ entitlements: Entitlements }>('/api/billing/entitlements')).entitlements);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); return () => { if (pollRef.current) window.clearInterval(pollRef.current); }; }, [load]);

  // A payment Razorpay has not confirmed yet: ask the server (which asks Razorpay) for up to 2 minutes
  const pollPayment = (paymentId: string) => {
    let tries = 0;
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      tries++;
      try {
        const { payment } = await api<{ payment: { status: string; planCode: string; failureReason: string | null } }>(`/api/billing/payments/${paymentId}`);
        if (payment.status === 'paid') { window.clearInterval(pollRef.current!); setOutcome({ kind: 'success', plan: payment.planCode }); load(); }
        else if (payment.status === 'failed') { window.clearInterval(pollRef.current!); setOutcome({ kind: 'failed', message: payment.failureReason ?? 'The payment failed.' }); }
      } catch { /* keep trying */ }
      if (tries >= 40) window.clearInterval(pollRef.current!);
    }, 3000);
  };

  const buy = async (plan: Plan) => {
    if (!token) { navigate('/login'); return; }
    setOutcome(null); setError(''); setBusy(plan.code);
    try {
      const { checkout } = await api<{ checkout: CheckoutPayload }>('/api/billing/checkout', { method: 'POST', json: { planCode: plan.code, idempotencyKey: idempotencyKey() } });
      await loadRazorpay();
      const rzp = new window.Razorpay!({
        key: checkout.keyId,
        amount: checkout.amountPaise,
        currency: checkout.currency,
        order_id: checkout.orderId,
        name: 'Meenzo',
        description: `${checkout.planName} — 30 days (one-time payment)`,
        prefill: checkout.prefill,
        theme: { color: '#0F1B45' },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // The server verifies with Razorpay before activating anything
          try {
            const v = await api<{ payment: { status: string; failureReason: string | null }; entitlements: Entitlements }>('/api/billing/verify', { method: 'POST', json: r });
            if (v.payment.status === 'paid') { setOutcome({ kind: 'success', plan: checkout.planName, endsAt: v.entitlements.subscription?.endsAt }); setEnt(v.entitlements); }
            else if (v.payment.status === 'failed') setOutcome({ kind: 'failed', message: v.payment.failureReason ?? 'The payment failed.' });
            else { setOutcome({ kind: 'pending', paymentId: checkout.paymentId }); pollPayment(checkout.paymentId); }
          } catch {
            setOutcome({ kind: 'pending', paymentId: checkout.paymentId });
            pollPayment(checkout.paymentId);
          } finally {
            setBusy(null);
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(null);
            setOutcome({ kind: 'cancelled' });
            api(`/api/billing/payments/${checkout.paymentId}/cancel`, { method: 'POST' }).catch(() => undefined);
          },
        },
      });
      rzp.on('payment.failed', (resp) => {
        const r = resp as { error?: { description?: string } };
        setOutcome({ kind: 'failed', message: r.error?.description ?? 'The payment failed. You can try again in the payment window.' });
      });
      rzp.open();
    } catch (e) {
      setBusy(null);
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  };

  const current = ent?.plan.code ?? 'free';

  const buttonFor = (p: Plan) => {
    if (p.code === 'free') return <Button fullWidth variant="outlined" disabled>{current === 'free' ? 'Your plan' : 'Included'}</Button>;
    const isCurrent = current === p.code;
    const isLower = (ent?.plan.tier ?? 0) > p.tier;
    const label = isCurrent ? 'Renew (adds 30 days)' : isLower ? 'Buy after current plan' : current === 'free' ? 'Upgrade' : 'Upgrade now';
    return (
      <Button fullWidth variant={isCurrent || !enabled ? 'outlined' : 'contained'} disabled={!enabled || busy !== null} onClick={() => buy(p)}
        startIcon={busy === p.code ? <CircularProgress size={16} color="inherit" /> : undefined} aria-label={`${label}: ${p.name}`}>
        {label}
      </Button>
    );
  };

  return (
    <Box>
      <Helmet><title>Plans — Meenzo</title></Helmet>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={800}>Plans</Typography>
        {token && <Button size="small" onClick={() => navigate('/subscription')}>My subscription & payments</Button>}
      </Stack>
      <Typography color="text.secondary" mb={2}>Paid plans are a <strong>one-time payment for 30 days</strong>. Nothing renews automatically.</Typography>

      {!enabled && !loading && <Alert severity="info" sx={{ mb: 2 }}>Online payments are not set up yet. Please check back soon.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {outcome?.kind === 'success' && (
        <Alert severity="success" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => navigate('/subscription')}>View</Button>}>
          <AlertTitle>Payment successful</AlertTitle>
          Your {outcome.plan} plan is active{outcome.endsAt ? ` until ${formatDate(outcome.endsAt)}` : ''}.
        </Alert>
      )}
      {outcome?.kind === 'pending' && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<CircularProgress size={18} />}>
          <AlertTitle>Confirming your payment…</AlertTitle>
          The bank hasn't confirmed it yet. You can leave this page — your plan starts automatically once it's confirmed. You won't be charged twice.
        </Alert>
      )}
      {outcome?.kind === 'failed' && <Alert severity="error" sx={{ mb: 2 }}><AlertTitle>Payment failed</AlertTitle>{outcome.message} No money was taken for a plan; if your bank shows a debit it is refunded automatically.</Alert>}
      {outcome?.kind === 'cancelled' && <Alert severity="warning" sx={{ mb: 2 }}>Payment cancelled. If you did pay, your plan starts automatically within a few minutes.</Alert>}

      {ent?.subscription && (
        <Alert severity="success" variant="outlined" sx={{ mb: 2 }}>
          You're on <strong>{ent.plan.name}</strong> until {formatDate(ent.subscription.endsAt)}.
          {ent.upcoming.length > 0 && ` ${ent.upcoming.length} more period(s) already paid.`}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, mb: 4 }}>
            {plans.map((p) => {
              const featured = highlight ? highlight === p.code : p.code === 'premium';
              return (
                <Card key={p.code} variant="outlined" sx={{ borderWidth: featured ? 2 : 1, borderColor: featured ? 'secondary.main' : 'divider', position: 'relative' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      {p.code === 'creator' && <WorkspacePremium color="warning" />}
                      <Typography variant="h6" fontWeight={800}>{p.name}</Typography>
                      {current === p.code && <Chip size="small" color="success" label="Current" />}
                    </Stack>
                    <Typography variant="h4" fontWeight={800}>{rupees(p.pricePaise, { whole: true })}<Typography component="span" color="text.secondary"> {p.pricePaise ? '/ 30 days' : ''}</Typography></Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ minHeight: 48, mt: 1 }}>{p.description}</Typography>
                    <Divider sx={{ my: 2 }} />
                    {buttonFor(p)}
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          <Typography variant="h6" fontWeight={700} mb={1}>Compare plans</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small" aria-label="Plan comparison">
              <TableHead>
                <TableRow>
                  <TableCell />
                  {plans.map((p) => <TableCell key={p.code} align="center" sx={{ fontWeight: 700 }}>{p.name}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {ROWS.map((r) => (
                  <TableRow key={r.label}>
                    <TableCell component="th" scope="row">{r.label}</TableCell>
                    <TableCell align="center"><Cell v={r.free} /></TableCell>
                    <TableCell align="center"><Cell v={r.premium} /></TableCell>
                    <TableCell align="center"><Cell v={r.creator} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" display="block">
            * Creator Premium makes you eligible to publish premium posts (every post is reviewed by a person) and to earn from eligible views. Earnings are not guaranteed.
            Upgrading from Premium converts your unused days into Creator Premium days. Prices include all taxes charged by Meenzo.
          </Typography>
        </>
      )}
    </Box>
  );
}
