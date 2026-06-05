import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack,
  Avatar, IconButton, InputAdornment, Alert,
} from '@mui/material';
import { Visibility, VisibilityOff, CameraAlt } from '@mui/icons-material';
import { useAppDispatch } from '../../store/hooks';
import { signup } from '../../store/slices/authSlice';

export function SignupPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    dispatch(signup({ name: form.name, username: form.username, email: form.email }));
    navigate('/home');
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
            sx={{
              width: 56, height: 56,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #5563DE, #E91E8C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Typography sx={{ fontSize: 28, color: 'white', fontWeight: 900, lineHeight: 1 }}>Q</Typography>
          </Box>
          <Typography variant="h5" fontWeight={800}>Join QuizHub</Typography>
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
                <TextField label="Username" value={form.username} onChange={update('username')}
                  fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start">@</InputAdornment> }}
                />
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
                <Button type="submit" variant="contained" size="large" fullWidth sx={{ py: 1.5 }}>
                  Create Account
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
