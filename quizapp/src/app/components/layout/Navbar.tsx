import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AppBar, Toolbar, Box, IconButton, Typography, InputBase,
  Badge, Menu, MenuItem, Avatar, Stack, Divider, ListItemIcon,
  Tooltip, alpha, useTheme,
} from '@mui/material';
import {
  Search, Notifications, Message, LightMode, DarkMode,
  Settings, Logout, Person, EmojiEvents, Menu as MenuIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleTheme } from '../../store/slices/themeSlice';
import { logout } from '../../store/slices/authSlice';
import { markAllRead } from '../../store/slices/notificationsSlice';
import { UserAvatar } from '../shared/UserAvatar';
import { formatDistanceToNow } from 'date-fns';

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
  const notifications = useAppSelector((s) => s.notifications.notifications);
  const chats = useAppSelector((s) => s.messages.chats);

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const unreadMessages = chats.reduce((acc, c) => acc + c.unreadCount, 0);

  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  const notifTypeIcon: Record<string, string> = {
    like: '❤️', comment: '💬', friend_request: '👥', message: '✉️', quiz_challenge: '🎯',
  };

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
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 160, display: { xs: 'none', sm: 'flex' } }}>
          <Box
            sx={{
              width: 36, height: 36,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #5563DE, #E91E8C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/home')}
          >
            <Typography sx={{ fontSize: 18, color: 'white', fontWeight: 800 }}>Q</Typography>
          </Box>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{
              background: 'linear-gradient(135deg, #5563DE, #E91E8C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/home')}
          >
            QuizHub
          </Typography>
        </Stack>

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

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton size="small" onClick={(e) => setNotifAnchor(e.currentTarget)}>
              <Badge badgeContent={unreadNotifications} color="error">
                <Notifications />
              </Badge>
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
          {user && (
            <Tooltip title="Profile">
              <IconButton onClick={(e) => setProfileAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
                <UserAvatar user={user} size={34} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {/* Notification Menu */}
        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          PaperProps={{ sx: { width: 360, maxHeight: 480, borderRadius: 3 } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={700}>Notifications</Typography>
            {unreadNotifications > 0 && (
              <Typography
                variant="caption"
                color="primary"
                sx={{ cursor: 'pointer', fontWeight: 600 }}
                onClick={() => dispatch(markAllRead())}
              >
                Mark all read
              </Typography>
            )}
          </Box>
          <Divider />
          {notifications.slice(0, 6).map((n) => (
            <MenuItem
              key={n.id}
              sx={{
                py: 1.5,
                bgcolor: n.read ? 'transparent' : 'primary.main',
                background: n.read ? undefined : alpha(theme.palette.primary.main, 0.06),
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start" width="100%">
                <Box sx={{ fontSize: 20 }}>{notifTypeIcon[n.type]}</Box>
                <Box flex={1}>
                  <Typography variant="body2">
                    <strong>{n.actor.name}</strong> {n.content}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                  </Typography>
                </Box>
                {!n.read && (
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.5, flexShrink: 0 }} />
                )}
              </Stack>
            </MenuItem>
          ))}
        </Menu>

        {/* Profile Menu */}
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={() => setProfileAnchor(null)}
          PaperProps={{ sx: { width: 220, borderRadius: 3 } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {user && (
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>{user.name}</Typography>
              <Typography variant="caption" color="text.secondary">@{user.username}</Typography>
            </Box>
          )}
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
