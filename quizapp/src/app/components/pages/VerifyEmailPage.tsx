import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Box, Card, CardContent, Typography, Alert, CircularProgress, Button } from '@mui/material';
import { CheckCircle, ErrorOutline } from '@mui/icons-material';

const API = import.meta.env.VITE_API_URL ?? '';

export function VerifyEmailPage() {
  const [params]          = useSearchParams();
  const token             = params.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Invalid verification link.'); return; }

    fetch(`${API}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setStatus('success'); setMessage(d.message); }
        else { setStatus('error'); setMessage(d.message ?? 'Verification failed.'); }
      })
      .catch(() => { setStatus('error'); setMessage('Something went wrong. Please try again.'); });
  }, [token]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          {status === 'loading' && (
            <>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">Verifying your email…</Typography>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" fontWeight={700} mb={1}>Email verified!</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>{message}</Typography>
              <Button variant="contained" component={Link as any} to="/login" sx={{ borderRadius: 2, fontWeight: 700 }}>
                Sign in
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <ErrorOutline sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />
              <Typography variant="h6" fontWeight={700} mb={1}>Verification failed</Typography>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2, textAlign: 'left' }}>{message}</Alert>
              <Button variant="outlined" component={Link as any} to="/resend-verification" sx={{ borderRadius: 2, fontWeight: 700 }}>
                Resend verification email
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
