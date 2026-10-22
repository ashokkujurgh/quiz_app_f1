import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert, AlertTitle, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton,
  InputAdornment, Radio, RadioGroup, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { AccountBalance, CardGiftcard, Delete, QrCode2 } from '@mui/icons-material';
import { api, idempotencyKey, rupees } from '../../../utils/monetization';

interface Method { id: string; type: 'bank' | 'upi' | 'amazon_gift_card'; label: string; masked: Record<string, string> }
interface Eligibility { canWithdraw: boolean; reasons: string[]; availablePaise: number; minPaise: number }

const ICON = { bank: AccountBalance, upi: QrCode2, amazon_gift_card: CardGiftcard };

function AddMethod({ onAdded }: { onAdded: () => void }) {
  const [type, setType] = useState<Method['type']>('upi');
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    setBusy(true); setError('');
    try { await api('/api/creator/payout-methods', { method: 'POST', json: { type, details: f } }); setF({}); onAdded(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography fontWeight={700} mb={1}>Add a payout method</Typography>
        <ToggleButtonGroup exclusive size="small" value={type} onChange={(_, v) => { if (v) { setType(v); setF({}); } }} sx={{ mb: 2 }} aria-label="Payout method type">
          <ToggleButton value="upi">UPI</ToggleButton>
          <ToggleButton value="bank">Bank account</ToggleButton>
          <ToggleButton value="amazon_gift_card">Amazon.in gift card</ToggleButton>
        </ToggleButtonGroup>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={1.5}>
          {type === 'upi' && <>
            <TextField label="UPI ID" placeholder="name@okaxis" value={f.upiId ?? ''} onChange={set('upiId')} autoComplete="off" />
            <TextField label="Name on the UPI account" value={f.name ?? ''} onChange={set('name')} />
          </>}
          {type === 'bank' && <>
            <TextField label="Account holder name" value={f.holderName ?? ''} onChange={set('holderName')} />
            <TextField label="Account number" value={f.accountNumber ?? ''} onChange={set('accountNumber')} inputProps={{ inputMode: 'numeric', autoComplete: 'off' }} />
            <TextField label="IFSC" placeholder="SBIN0001234" value={f.ifsc ?? ''} onChange={set('ifsc')} inputProps={{ style: { textTransform: 'uppercase' } }} />
            <TextField label="Bank name" value={f.bankName ?? ''} onChange={set('bankName')} />
          </>}
          {type === 'amazon_gift_card' && <>
            <TextField label="Marketplace" value="amazon.in" disabled />
            <TextField label="Delivery email" type="email" value={f.deliveryEmail ?? ''} onChange={set('deliveryEmail')} helperText="The gift card code is emailed here. Gift cards are in whole rupees." />
          </>}
          <Typography variant="caption" color="text.secondary">Your details are encrypted and only shown masked. An admin sees them only when paying you.</Typography>
          <Button variant="contained" onClick={save} disabled={busy}>Save payout method</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

/** /creator/withdraw — payout methods and a new withdrawal request. */
export function WithdrawPage() {
  const navigate = useNavigate();
  const [methods, setMethods] = useState<Method[]>([]);
  const [el, setEl] = useState<Eligibility | null>(null);
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [key] = useState(idempotencyKey);

  const load = useCallback(async () => {
    try {
      const [m, e] = await Promise.all([api<{ methods: Method[] }>('/api/creator/payout-methods'), api<{ eligibility: Eligibility }>('/api/creator/withdrawals/eligibility')]);
      setMethods(m.methods); setEl(e.eligibility);
      setMethodId((cur) => cur || m.methods[0]?.id || '');
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!window.confirm('Remove this payout method?')) return;
    try { await api(`/api/creator/payout-methods/${id}`, { method: 'DELETE' }); setMethodId(''); load(); } catch (e) { setError((e as Error).message); }
  };

  const paise = Math.round(parseFloat(amount || '0') * 100);
  const method = methods.find((m) => m.id === methodId);
  const amountProblem = !amount ? '' : !Number.isFinite(paise) || paise <= 0 ? 'Enter an amount.'
    : el && paise < el.minPaise ? `The minimum is ${rupees(el.minPaise)}.`
    : el && paise > el.availablePaise ? `You can withdraw up to ${rupees(el.availablePaise)}.`
    : method?.type === 'amazon_gift_card' && paise % 100 !== 0 ? 'Gift cards are whole rupees.' : '';

  const request = async () => {
    setConfirm(false); setBusy(true); setError('');
    try {
      await api('/api/creator/withdrawals', { method: 'POST', json: { amountPaise: paise, payoutMethodId: methodId, idempotencyKey: key } });
      setDone(`Withdrawal of ${rupees(paise)} requested. We'll review it and pay it to ${method?.label}.`);
      setAmount(''); load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  if (!el) return error ? <Alert severity="error">{error}</Alert> : <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box maxWidth={760}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={800}>Withdraw earnings</Typography>
        <Button onClick={() => navigate('/creator/withdrawals')}>Withdrawal history</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {done && <Alert severity="success" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => navigate('/creator/withdrawals')}>Track it</Button>}>{done}</Alert>}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="caption" color="text.secondary">Available to withdraw</Typography>
          <Typography variant="h4" fontWeight={800} color="success.main">{rupees(el.availablePaise)}</Typography>
          <Typography variant="body2" color="text.secondary">Minimum {rupees(el.minPaise)}. Only cleared earnings can be withdrawn. Payouts are made manually, usually within a few working days.</Typography>
        </CardContent>
      </Card>

      {!el.canWithdraw && (
        <Alert severity="info" sx={{ mb: 2 }}><AlertTitle>You can't withdraw right now</AlertTitle>{el.reasons.join(' ')}</Alert>
      )}

      {methods.length > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography fontWeight={700} mb={1}>Pay to</Typography>
            <RadioGroup value={methodId} onChange={(e) => setMethodId(e.target.value)} aria-label="Payout method">
              {methods.map((m) => {
                const Icon = ICON[m.type];
                return (
                  <Stack key={m.id} direction="row" alignItems="center" justifyContent="space-between">
                    <FormControlLabel value={m.id} control={<Radio />} label={<Stack direction="row" spacing={1} alignItems="center"><Icon fontSize="small" /><span>{m.label}</span></Stack>} />
                    <IconButton aria-label={`Remove ${m.label}`} onClick={() => remove(m.id)}><Delete fontSize="small" /></IconButton>
                  </Stack>
                );
              })}
            </RadioGroup>
            {el.canWithdraw && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mt={2} alignItems={{ sm: 'flex-start' }}>
                <TextField
                  label="Amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} inputProps={{ inputMode: 'decimal' }}
                  error={!!amountProblem} helperText={amountProblem || ' '}
                />
                <Button variant="text" onClick={() => setAmount((el.availablePaise / 100).toFixed(2))} sx={{ mt: 1 }}>Max</Button>
                <Button variant="contained" sx={{ mt: 1 }} disabled={!amount || !!amountProblem || !methodId || busy} onClick={() => setConfirm(true)}>Request withdrawal</Button>
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {methods.length < 3 && <AddMethod onAdded={load} />}

      <Dialog open={confirm} onClose={() => setConfirm(false)}>
        <DialogTitle>Confirm withdrawal</DialogTitle>
        <DialogContent>
          <Typography>Withdraw <strong>{rupees(paise)}</strong> to <strong>{method?.label}</strong>?</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>The amount is set aside now. If the payout is rejected or fails, it comes back to your balance.</Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setConfirm(false)}>Cancel</Button><Button variant="contained" onClick={request}>Confirm</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
