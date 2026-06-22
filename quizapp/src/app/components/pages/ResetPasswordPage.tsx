import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import { Lock, Visibility, VisibilityOff } from '@mui/icons-material';

const API = import.meta.env.VITE_API_URL ?? '';

export function ResetPasswordPage() {
  const [params]            = useSearchParams();
  const navigate            = useNavigate();
  const token               = params.get('token') ?? '';

  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message ?? 'Failed');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError((err as Error).message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Alert severity="error">Invalid reset link. <Link to="/forgot-password">Request a new one</Link>.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={1}>Set new password</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Choose a strong password for your Meenzo account.
          </Typography>

          {success ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Password reset successfully! Redirecting to login…
            </Alert>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  label="New password"
                  type={showPwd ? 'text' : 'password'}
                  fullWidth required autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPwd((v) => !v)}>
                          {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Confirm password"
                  type={showPwd ? 'text' : 'password'}
                  fullWidth required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  InputProps={{ startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" /> }}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading || !password || !confirm}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
                  sx={{ py: 1.4, fontWeight: 700, borderRadius: 2 }}
                >
                  {loading ? 'Resetting…' : 'Reset password'}
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
