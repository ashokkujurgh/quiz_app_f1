import { useState } from 'react';
import { Link } from 'react-router';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { Email } from '@mui/icons-material';

const API = import.meta.env.VITE_API_URL ?? '';

export function ResendVerificationPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message ?? 'Failed');
      setSent(true);
    } catch (err) {
      setError((err as Error).message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={1}>Resend verification</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Enter your email and we'll send a new verification link.
          </Typography>

          {sent ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              If <strong>{email}</strong> is registered and unverified, a new link has been sent. Check your inbox.
            </Alert>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  label="Email address" type="email" fullWidth required autoFocus
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  InputProps={{ startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" /> }}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit" variant="contained" fullWidth size="large"
                  disabled={loading || !email}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
                  sx={{ py: 1.4, fontWeight: 700, borderRadius: 2 }}
                >
                  {loading ? 'Sending…' : 'Resend link'}
                </Button>
              </Box>
            </>
          )}

          <Typography variant="body2" color="text.secondary" textAlign="center" mt={3}>
            <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>Back to sign in</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
