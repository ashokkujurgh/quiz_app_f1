import { useState } from 'react';
import logoUrl from '../../../assets/logo.png';
import { Link } from 'react-router';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack,
  IconButton, InputAdornment, Alert,
} from '@mui/material';
import { Visibility, VisibilityOff, MarkEmailRead } from '@mui/icons-material';

const API = import.meta.env.VITE_API_URL ?? '';

export function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all fields.'); return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.'); return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Registration failed.'); return; }
      setRegistered(true);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
        <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <MarkEmailRead sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} mb={1}>Check your email</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              We sent a verification link to <strong>{form.email}</strong>. Click the link to activate your account.
            </Typography>
            <Button variant="contained" component={Link as any} to="/login" sx={{ borderRadius: 2, fontWeight: 700, mb: 2 }} fullWidth>
              Go to sign in
            </Button>
            <Typography variant="body2" color="text.secondary">
              Didn't receive it?{' '}
              <Link to="/resend-verification" style={{ color: 'inherit', fontWeight: 600 }}>Resend email</Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
        background: 'linear-gradient(135deg, #5563DE12 0%, #E91E8C08 100%)',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Stack alignItems="center" spacing={1} mb={4}>
          <Box
            component="img"
            src={logoUrl}
            alt="Meenzo"
            sx={{ height: 60, maxWidth: 180, objectFit: 'contain' }}
          />
          <Typography variant="h5" fontWeight={800}>Join Meenzo</Typography>
          <Typography variant="body2" color="text.secondary">Create your account and start quizzing!</Typography>
        </Stack>

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 4 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}


            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField label="Full Name" value={form.name} onChange={update('name')} fullWidth />
                <TextField label="Email address" type="email" value={form.email} onChange={update('email')} fullWidth />
                <TextField
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPw(!showPw)}>
                          {showPw ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Confirm Password"
                  type="password"
                  value={form.confirm}
                  onChange={update('confirm')}
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ py: 1.5 }}>
                  {loading ? 'Creating account…' : 'Create Account'}
                </Button>
                <Typography variant="body2" textAlign="center">
                  Already have an account?{' '}
                  <Typography
                    component={Link as any}
                    to="/login"
                    variant="body2"
                    color="primary"
                    fontWeight={700}
                    sx={{ textDecoration: 'none' }}
                  >
                    Sign in
                  </Typography>
                </Typography>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
