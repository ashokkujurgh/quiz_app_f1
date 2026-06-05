import {
  Box, Typography, Stack, Card, CardContent, Switch,
  FormControlLabel, Divider, Button, TextField, Avatar, Select,
  MenuItem, FormControl, InputLabel,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { toggleTheme } from '../../store/slices/themeSlice';
import { logout } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router';

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const themeMode = useAppSelector((s) => s.theme.mode);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>{title}</Typography>
        {children}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} mb={3}>Settings</Typography>

      <Section title="Appearance">
        <FormControlLabel
          control={
            <Switch
              checked={themeMode === 'dark'}
              onChange={() => dispatch(toggleTheme())}
            />
          }
          label="Dark Mode"
        />
      </Section>

      <Section title="Account">
        <Stack spacing={2.5}>
          <TextField label="Full Name" defaultValue={user?.name} fullWidth />
          <TextField label="Username" defaultValue={user?.username} fullWidth
            InputProps={{ startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 0.5 }}>@</Box> }} />
          <TextField label="Email" type="email" defaultValue={user?.email} fullWidth />
          <TextField label="Bio" defaultValue={user?.bio} fullWidth multiline rows={3} />
          <Button variant="contained" sx={{ alignSelf: 'flex-start' }}>Save Changes</Button>
        </Stack>
      </Section>

      <Section title="Notifications">
        {[
          'Friend requests',
          'Likes and comments on posts',
          'Quiz challenges',
          'Direct messages',
          'Leaderboard updates',
        ].map((label) => (
          <FormControlLabel
            key={label}
            control={<Switch defaultChecked />}
            label={label}
            sx={{ display: 'flex', justifyContent: 'space-between', mx: 0, mb: 1 }}
            labelPlacement="start"
          />
        ))}
      </Section>

      <Section title="Privacy">
        {[
          'Show online status',
          'Allow friend requests',
          'Show quiz results on profile',
        ].map((label) => (
          <FormControlLabel
            key={label}
            control={<Switch defaultChecked />}
            label={label}
            sx={{ display: 'flex', justifyContent: 'space-between', mx: 0, mb: 1 }}
            labelPlacement="start"
          />
        ))}
      </Section>

      <Section title="Security">
        <Stack spacing={2}>
          <Button variant="outlined">Change Password</Button>
          <Button variant="outlined" color="error">Delete Account</Button>
        </Stack>
      </Section>

      <Button
        variant="contained"
        color="error"
        fullWidth
        sx={{ mb: 4 }}
        onClick={() => { dispatch(logout()); navigate('/login'); }}
      >
        Sign Out
      </Button>
    </Box>
  );
}
