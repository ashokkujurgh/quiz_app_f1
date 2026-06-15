import { useNavigate, useLocation } from 'react-router';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Divider, Stack, Badge, Avatar, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import {
  Home, Quiz, People, Message, EmojiEvents, History,
  Person, AdminPanelSettings, Lock,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useOnlineUsers } from '../../context/OnlineUsersContext';
import { UserAvatar } from '../shared/UserAvatar';
import { fetchIncoming } from '../../store/slices/friendsSlice';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Home',        icon: Home,       path: '/home',        auth: false },
  { label: 'Quizzes',     icon: Quiz,       path: '/quizzes',     auth: false },
  { label: 'Friends',     icon: People,     path: '/friends',     auth: true },
  { label: 'Messages',    icon: Message,    path: '/messages',    auth: true },
  { label: 'Leaderboard', icon: EmojiEvents,path: '/leaderboard', auth: true },
  { label: 'History',     icon: History,    path: '/history',     auth: true },
  { label: 'Profile',     icon: Person,     path: '/profile',     auth: true },
];

interface Props {
  open: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'temporary';
}

export function LeftSidebar({ open, onClose, variant = 'permanent' }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { user, accessToken } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (accessToken) dispatch(fetchIncoming());
  }, [accessToken, dispatch]);
  const { isOnline } = useOnlineUsers();
  const unreadMessages = useAppSelector((s) =>
    Object.values(s.messages.unreadByConv).reduce((a, c) => a + c, 0)
  );
  const friendRequestCount = useAppSelector((s) => s.friends.incoming.length);
  const [loginPrompt, setLoginPrompt] = useState(false);

  const handleNav = (path: string, requiresAuth: boolean) => {
    if (requiresAuth && !accessToken) { setLoginPrompt(true); return; }
    navigate(path);
    onClose();
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', pt: '64px' }}>
      {/* User summary */}
      <Box
        sx={{ px: 2, py: 2, cursor: 'pointer' }}
        onClick={() => handleNav('/profile', true)}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {user ? (
            <UserAvatar user={{ ...user, isOnline: true }} size={44} showOnline />
          ) : (
            <Avatar sx={{ width: 44, height: 44 }} />
          )}
          <Box minWidth={0}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>{user?.name ?? ''}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{user?.email ?? ''}</Typography>
          </Box>
        </Stack>
      </Box>
      <Divider sx={{ mx: 2 }} />

      {/* Nav */}
      <List sx={{ px: 1, flex: 1, pt: 1 }}>
        {navItems.map(({ label, icon: Icon, path, auth }) => {
          const isActive = location.pathname === path;
          const badge = label === 'Messages' ? unreadMessages : label === 'Friends' ? friendRequestCount : 0;
          const locked = auth && !accessToken;
          return (
            <ListItemButton
              key={path}
              selected={isActive}
              onClick={() => handleNav(path, auth)}
              sx={{ mb: 0.25, borderRadius: 2, py: 1, opacity: locked ? 0.65 : 1 }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'primary.main' : 'text.secondary' }}>
                {badge > 0 ? (
                  <Badge badgeContent={badge} color="primary">
                    <Icon fontSize="small" />
                  </Badge>
                ) : (
                  <Icon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'primary.main' : 'text.primary',
                }}
              />
              {locked && <Lock sx={{ fontSize: 13, color: 'text.disabled', ml: 0.5 }} />}
            </ListItemButton>
          );
        })}

        {user?.role === 'admin' && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItemButton
              selected={location.pathname === '/admin'}
              onClick={() => handleNav('/admin', true)}
              sx={{ mb: 0.25, borderRadius: 2, py: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: location.pathname === '/admin' ? 'primary.main' : 'text.secondary' }}>
                <AdminPanelSettings fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Admin"
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
              />
            </ListItemButton>
          </>
        )}
      </List>

      {/* Footer */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          © 2026 Meenzo
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant={variant}
        open={variant === 'temporary' ? open : true}
        onClose={onClose}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Login required dialog */}
      <Dialog open={loginPrompt} onClose={() => setLoginPrompt(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock color="primary" fontSize="small" /> Sign in required
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            You need to be signed in to access this feature.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginPrompt(false)}>Cancel</Button>
          <Button variant="outlined" onClick={() => { setLoginPrompt(false); navigate('/signup'); }}>
            Create Account
          </Button>
          <Button variant="contained" onClick={() => { setLoginPrompt(false); navigate('/login'); }}>
            Sign In
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
