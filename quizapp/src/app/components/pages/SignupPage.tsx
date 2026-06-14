import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack,
  Avatar, IconButton, InputAdornment, Alert,
} from '@mui/material';
import { Visibility, VisibilityOff, CameraAlt } from '@mui/icons-material';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAppDispatch } from '../../store/hooks';
import { loginSuccess } from '../../store/slices/authSlice';

const API = import.meta.env.VITE_API_URL ?? '';

export function SignupPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

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
      // Step 1 — Create user in Firebase
      const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(credential.user, { displayName: form.name });
      const idToken = await credential.user.getIdToken();

      // Step 2 — Exchange Firebase ID token with backend
      const res = await fetch(`${API}/api/auth/firebase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken, name: form.name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Registration failed.'); return; }
      dispatch(loginSuccess({ user: data.user, accessToken: data.accessToken }));
      navigate('/home');
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setError('Email is already registered. Please sign in.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError(err?.message ?? 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

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
            src="/src/assets/logo.png"
            alt="Meenzo"
            sx={{ height: 60, maxWidth: 180, objectFit: 'contain' }}
          />
          <Typography variant="h5" fontWeight={800}>Join Meenzo</Typography>
          <Typography variant="body2" color="text.secondary">Create your account and start quizzing!</Typography>
        </Stack>

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 4 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Avatar Upload */}
            <Stack alignItems="center" mb={3}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  sx={{
                    width: 80, height: 80,
                    background: 'linear-gradient(135deg, #5563DE, #E91E8C)',
                    fontSize: 32,
                  }}
                >
                  {form.name[0] || 'U'}
                </Avatar>
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute', bottom: -4, right: -4,
                    bgcolor: 'primary.main', color: 'white',
                    width: 28, height: 28,
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  <CameraAlt sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
              <Typography variant="caption" color="text.secondary" mt={1}>
                Upload profile photo
              </Typography>
            </Stack>

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
