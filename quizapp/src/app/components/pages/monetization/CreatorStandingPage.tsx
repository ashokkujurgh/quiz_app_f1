import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { Gavel } from '@mui/icons-material';
import { api, formatDate } from '../../../utils/monetization';
import { EmptyState } from '../../shared/EmptyState';

interface V { id: string; postTitle: string; category: string; reason: string; confirmedAt: string; consequence: string; status: string; overturnReason: string | null; appeal: { status: string; submittedAt: string | null; decidedAt: string | null; note: string | null } }
interface Standing { confirmedViolations: number; restriction: { active: boolean; until: string | null }; policy: string; violations: V[] }

const CONSEQUENCE: Record<string, string> = { warning_1: 'Warning 1', warning_2: 'Warning 2', restriction_30d: '30-day block' };

/** /creator/standing — confirmed violations, warnings, block and appeals. */
export function CreatorStandingPage() {
  const [s, setS] = useState<Standing | null>(null);
  const [error, setError] = useState('');
  const [appealFor, setAppealFor] = useState<V | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api<{ standing: Standing }>('/api/posts/premium/standing').then((d) => setS(d.standing)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const sendAppeal = async () => {
    if (!appealFor) return;
    setBusy(true);
    try { await api(`/api/posts/premium/violations/${appealFor.id}/appeal`, { method: 'POST', json: { text } }); setAppealFor(null); setText(''); load(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  if (!s) return error ? <Alert severity="error">{error}</Alert> : <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box maxWidth={820}>
      <Typography variant="h5" fontWeight={800} mb={1}>Account standing</Typography>
      <Typography color="text.secondary" mb={2}>{s.policy}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {s.restriction.active
        ? <Alert severity="error" sx={{ mb: 2 }}>You can't submit premium posts until {formatDate(s.restriction.until)}. Drafts can still be written.</Alert>
        : <Alert severity={s.confirmedViolations ? 'warning' : 'success'} sx={{ mb: 2 }}>{s.confirmedViolations ? `${s.confirmedViolations} confirmed violation(s) on record.` : 'No violations. Keep it up!'}</Alert>}
      {s.violations.length === 0 ? (
        <EmptyState icon={Gavel} title="Nothing here" description="Confirmed policy violations would be listed here." />
      ) : (
        <Stack spacing={1.5}>
          {s.violations.map((v) => (
            <Card key={v.id} variant="outlined" sx={{ opacity: v.status === 'overturned' ? 0.7 : 1 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={0.5}>
                  <Chip size="small" color={v.status === 'overturned' ? 'default' : 'error'} label={v.status === 'overturned' ? 'Overturned' : CONSEQUENCE[v.consequence]} />
                  <Chip size="small" variant="outlined" label={v.category.replace(/_/g, ' ')} />
                  <Typography variant="caption" color="text.secondary">{formatDate(v.confirmedAt)}</Typography>
                </Stack>
                <Typography fontWeight={600}>{v.postTitle}</Typography>
                <Typography variant="body2" color="text.secondary">{v.reason}</Typography>
                {v.overturnReason && <Typography variant="body2" color="success.main" mt={0.5}>Overturned: {v.overturnReason}</Typography>}
                {v.appeal.status === 'pending' && <Typography variant="body2" mt={0.5}>Appeal sent {formatDate(v.appeal.submittedAt)} — waiting for a decision.</Typography>}
                {v.appeal.status === 'upheld' && <Typography variant="body2" mt={0.5}>Appeal reviewed: the violation stands. {v.appeal.note}</Typography>}
                {v.status === 'confirmed' && v.appeal.status === 'none' && <Button size="small" sx={{ mt: 1 }} onClick={() => setAppealFor(v)}>Appeal</Button>}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      <Dialog open={!!appealFor} onClose={() => setAppealFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Appeal this decision</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>Explain why the decision on “{appealFor?.postTitle}” should be reconsidered. Each violation can be appealed once, and a different reviewer or an admin decides.</Typography>
          <TextField autoFocus fullWidth multiline minRows={4} value={text} onChange={(e) => setText(e.target.value)} label="Your appeal" inputProps={{ maxLength: 2000 }} helperText={`${text.trim().length}/2000 (at least 20)`} />
        </DialogContent>
        <DialogActions><Button onClick={() => setAppealFor(null)}>Cancel</Button><Button variant="contained" disabled={text.trim().length < 20 || busy} onClick={sendAppeal}>Send appeal</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
