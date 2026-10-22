import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { SportsEsports } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { api, ApiError, formatDateTime } from '../../utils/monetization';
import { UpgradePrompt } from './UpgradePrompt';

interface Invite {
  id: string; status: 'pending' | 'accepted'; expiresAt: string;
  quiz: { id: string; title: string; scheduledAt: string; durationMinutes: number; status: string };
  canPlay: { allowed: boolean; message?: string; code?: string };
}

/** Open game invites. Accepting holds a Free player's daily play for that game. */
export function GameInvitesCard() {
  const token = useAppSelector((s) => s.auth.accessToken);
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    api<{ invites: Invite[] }>('/api/quizzes/my/invites').then((d) => setInvites(d.invites)).catch(() => setInvites([]));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const act = async (inv: Invite, action: 'accept' | 'decline') => {
    setBusy(inv.id); setError(null);
    try { await api(`/api/quizzes/invites/${inv.id}/${action}`, { method: 'POST' }); load(); }
    catch (e) { setError(e as ApiError); } finally { setBusy(null); }
  };

  if (!invites.length) return null;
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}><SportsEsports color="secondary" /><Typography fontWeight={700}>Game invites</Typography></Stack>
        {error && (error.code === 'QUOTA_EXCEEDED'
          ? <Box mb={1}><UpgradePrompt message={error.message} onClose={() => setError(null)} /></Box>
          : <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>{error.message}</Alert>)}
        <Stack spacing={1.5}>
          {invites.map((inv) => (
            <Box key={inv.id}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
                <Box>
                  <Typography fontWeight={600}>{inv.quiz.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{inv.quiz.status === 'active' ? 'Live now' : `Starts ${formatDateTime(inv.quiz.scheduledAt)}`} · {inv.quiz.durationMinutes} min</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  {inv.status === 'accepted' ? (
                    <>
                      <Button size="small" variant="contained" onClick={() => navigate(`/quiz/play/${inv.quiz.id}`)} disabled={inv.quiz.status !== 'active'}>{inv.quiz.status === 'active' ? 'Play' : 'Accepted'}</Button>
                      <Button size="small" color="inherit" disabled={busy === inv.id} onClick={() => act(inv, 'decline')}>Can't make it</Button>
                    </>
                  ) : (
                    <>
                      <Button size="small" variant="contained" disabled={busy === inv.id || !inv.canPlay.allowed} onClick={() => act(inv, 'accept')}>Accept</Button>
                      <Button size="small" color="inherit" disabled={busy === inv.id} onClick={() => act(inv, 'decline')}>Decline</Button>
                    </>
                  )}
                </Stack>
              </Stack>
              {!inv.canPlay.allowed && inv.canPlay.message && <Box mt={1}><UpgradePrompt message={inv.canPlay.message} /></Box>}
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
