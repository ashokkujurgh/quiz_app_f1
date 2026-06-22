import { useState } from 'react';
import { Link } from 'react-router';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress,
} from '@mui/material';
import { Email, ArrowBack } from '@mui/icons-material';

const API = import.meta.env.VITE_API_URL ?? '';

export function ForgotPasswordPage() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message ?? 'Failed');
      setSent(true);
    } catch (err) {
      setError((err as Error).message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Button component={Link} to="/login" startIcon={<ArrowBack />} size="small" sx={{ mr: 1 }} />
            <Typography variant="h5" fontWeight={700}>Forgot password</Typography>
          </Box>

          {sent ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Check your inbox! If <strong>{email}</strong> is registered you'll receive a reset link within a few minutes.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Enter your email address and we'll send you a link to reset your password.
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  label="Email address"
                  type="email"
                  fullWidth
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  InputProps={{ startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" /> }}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading || !email}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
                  sx={{ py: 1.4, fontWeight: 700, borderRadius: 2 }}
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </Box>
            </>
          )}

          <Typography variant="body2" color="text.secondary" textAlign="center" mt={3}>
            Remember your password?{' '}
            <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>Sign in</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
