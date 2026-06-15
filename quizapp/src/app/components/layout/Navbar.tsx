import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AppBar, Toolbar, Box, IconButton, Typography, InputBase,
  Badge, Menu, MenuItem, Avatar, Stack, Divider, ListItemIcon,
  Tooltip, alpha, useTheme,
} from '@mui/material';
import {
  Search, Message, LightMode, DarkMode,
  Settings, Logout, Person, EmojiEvents, Menu as MenuIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleTheme } from '../../store/slices/themeSlice';
import { logout } from '../../store/slices/authSlice';
import { UserAvatar } from '../shared/UserAvatar';

const DRAWER_WIDTH = 260;

interface Props {
  onMenuToggle: () => void;
}

export function Navbar({ onMenuToggle }: Props) {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const themeMode = useAppSelector((s) => s.theme.mode);
  const unreadMessages = useAppSelector((s) =>
    Object.values(s.messages.unreadByConv).reduce((a, c) => a + c, 0)
  );

  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
        left: 0, right: 0,
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: '64px !important' }}>
        {/* Hamburger + Logo */}
        <IconButton onClick={onMenuToggle} sx={{ display: { md: 'none' } }}>
          <MenuIcon />
        </IconButton>
        <Box
          component="img"
          src="/src/assets/logo.png"
          alt="Meenzo"
          sx={{ height: 40, maxWidth: 140, objectFit: 'contain', cursor: 'pointer', display: { xs: 'none', sm: 'block' } }}
          onClick={() => navigate('/home')}
        />

        {/* Search */}
        <Box
          sx={{
            flex: 1,
            maxWidth: 400,
            mx: 2,
            display: { xs: 'none', sm: 'block' },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: alpha(theme.palette.text.primary, 0.06),
              borderRadius: 3,
              px: 2, py: 0.5,
              gap: 1,
            }}
          >
            <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
            <InputBase
              placeholder="Search quizzes, friends..."
              fullWidth
              sx={{ fontSize: '0.875rem' }}
            />
          </Box>
        </Box>

        <Box flex={1} />

        {/* Actions */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          {/* Theme toggle */}
          <Tooltip title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton onClick={() => dispatch(toggleTheme())} size="small">
              {themeMode === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>

          {/* Messages */}
          <Tooltip title="Messages">
            <IconButton size="small" onClick={() => navigate('/messages')}>
              <Badge badgeContent={unreadMessages} color="primary">
                <Message />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Profile */}
          <Tooltip title="Profile">
            <IconButton onClick={(e) => setProfileAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
              {user ? (
                <UserAvatar user={user} size={34} />
              ) : (
                <Avatar sx={{ width: 34, height: 34 }} />
              )}
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Profile Menu */}
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={() => setProfileAnchor(null)}
          PaperProps={{ sx: { width: 220, borderRadius: 3 } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>{user?.name ?? ''}</Typography>
            <Typography variant="caption" color="text.secondary">@{user?.username ?? ''}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { navigate('/profile'); setProfileAnchor(null); }}>
            <ListItemIcon><Person fontSize="small" /></ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={() => { navigate('/leaderboard'); setProfileAnchor(null); }}>
            <ListItemIcon><EmojiEvents fontSize="small" /></ListItemIcon>
            Leaderboard
          </MenuItem>
          <MenuItem onClick={() => { navigate('/settings'); setProfileAnchor(null); }}>
            <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { dispatch(logout()); navigate('/login'); setProfileAnchor(null); }} sx={{ color: 'error.main' }}>
            <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
