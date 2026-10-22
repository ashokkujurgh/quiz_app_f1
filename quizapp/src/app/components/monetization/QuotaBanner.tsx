import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { useAppSelector } from '../../store/hooks';
import { fetchQuota, type Quota } from '../../utils/monetization';

/** "1 of 1 free quiz plays left today" — shown where quizzes are played or created. */
export function QuotaBanner({ show = ['quiz_play', 'quiz_create'] }: { show?: ('quiz_play' | 'quiz_create')[] }) {
  const token = useAppSelector((s) => s.auth.accessToken);
  const navigate = useNavigate();
  const [quota, setQuota] = useState<Quota | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchQuota().then(setQuota).catch(() => setQuota(null));
  }, [token]);

  if (!quota || quota.isPaid) {
    return quota?.isPaid ? (
      <Chip size="small" color="success" variant="outlined" label={`${quota.plan.name}: unlimited quizzes`} sx={{ mb: 2 }} />
    ) : null;
  }

  const labels = { quiz_play: 'quiz play', quiz_create: 'quiz creation' } as const;
  const items = show.map((k) => ({ key: k, c: quota.credits[k] }));
  const anyOut = items.some(({ c }) => !c.unlimited && (c.remaining ?? 0) === 0);
  const resets = quota.resetsAt ? new Date(quota.resetsAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : 'midnight';

  return (
    <Alert
      severity={anyOut ? 'warning' : 'info'}
      sx={{ mb: 2 }}
      action={<Button color="inherit" size="small" onClick={() => navigate('/plans')}>Go unlimited</Button>}
    >
      <Stack spacing={0.25}>
        {items.map(({ key, c }) => (
          <Typography key={key} variant="body2">
            <strong>{c.remaining ?? 0} of {c.limit}</strong> free {labels[key]}{c.limit === 1 ? '' : 's'} left today
            {c.reserved > 0 && ' (one is held for a game invite you accepted)'}
          </Typography>
        ))}
        <Box component="span" sx={{ fontSize: 12, opacity: 0.8 }}>Resets at {resets} IST. Practice tests are always free.</Box>
      </Stack>
    </Alert>
  );
}
