import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack,
  Divider, FormControlLabel, Checkbox, IconButton, InputAdornment, Alert,
} from '@mui/material';
import { Visibility, VisibilityOff, Google } from '@mui/icons-material';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAppDispatch } from '../../store/hooks';
import { loginSuccess } from '../../store/slices/authSlice';

const API = import.meta.env.VITE_API_URL ?? '';

export function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError(''); setLoading(true);
    try {
      // Step 1 — Sign in with Firebase
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken    = await credential.user.getIdToken();

      // Step 2 — Exchange Firebase ID token with backend
      const res = await fetch(`${API}/api/auth/firebase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Login failed.'); return; }
      dispatch(loginSuccess({ user: data.user, accessToken: data.accessToken }));
      navigate('/home');
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError(err?.message ?? 'Login failed. Please try again.');
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
        {/* Logo */}
        <Stack alignItems="center" spacing={1} mb={4}>
          <Box
            sx={{
              width: 56, height: 56,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #5563DE, #E91E8C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Typography sx={{ fontSize: 28, color: 'white', fontWeight: 900, lineHeight: 1 }}>Q</Typography>
          </Box>
          <Typography variant="h5" fontWeight={800}>Welcome back to QuizHub</Typography>
          <Typography variant="body2" color="text.secondary">Sign in to continue your learning journey</Typography>
        </Stack>

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 4 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  size="medium"
                />
                <TextField
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  size="medium"
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

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <FormControlLabel
                    control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} size="small" />}
                    label={<Typography variant="body2">Remember me</Typography>}
                  />
                  <Typography variant="body2" color="primary" sx={{ cursor: 'pointer', fontWeight: 600 }}>
                    Forgot password?
                  </Typography>
                </Stack>

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ py: 1.5 }}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>

                <Divider>
                  <Typography variant="caption" color="text.secondary">or continue with</Typography>
                </Divider>

                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  startIcon={<Google />}
                  sx={{ py: 1.5 }}
                  disabled
                >
                  Continue with Google
                </Button>

                <Typography variant="body2" textAlign="center">
                  Don't have an account?{' '}
                  <Typography
                    component={Link as any}
                    to="/signup"
                    variant="body2"
                    color="primary"
                    fontWeight={700}
                    sx={{ textDecoration: 'none' }}
                  >
                    Sign up
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
