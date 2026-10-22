import { useNavigate, useLocation } from 'react-router';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Divider, Stack, Badge, Avatar, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import {
  Home, Quiz, People, Message, EmojiEvents, History,
  Person, Lock, Article, WorkspacePremium, Create, FactCheck,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { UserAvatar } from '../shared/UserAvatar';
import { fetchIncoming, refreshIncoming } from '../../store/slices/friendsSlice';
import { SHOW_LEADERBOARD } from '../../utils/features';

const DRAWER_WIDTH = 260;
const FRIEND_REQUEST_POLL_MS = 60_000;

const navItems = [
  { label: 'Home',        icon: Home,       path: '/home',        auth: false },
  { label: 'Quizzes',     icon: Quiz,       path: '/quizzes',     auth: false },
  { label: 'Friends',     icon: People,     path: '/friends',     auth: true },
  { label: 'Messages',    icon: Message,    path: '/messages',    auth: true },
  ...(SHOW_LEADERBOARD ? [{ label: 'Leaderboard', icon: EmojiEvents, path: '/leaderboard', auth: true }] : []),
  { label: 'My Posts',    icon: Article,    path: '/posts',       auth: true },
  { label: 'History',     icon: History,    path: '/history',     auth: true },
  { label: 'Profile',     icon: Person,     path: '/profile',     auth: true },
  { label: 'Plans',       icon: WorkspacePremium, path: '/plans', auth: false },
  { label: 'Creator Studio', icon: Create,  path: '/creator',     auth: true },
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
  const user = useAppSelector((s) => s.auth.user);
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  // Friend-request badge: load on login, then keep it current while browsing — every minute
  // while the tab is visible, and straight away when you come back to the tab
  useEffect(() => {
    if (!accessToken) return;
    dispatch(fetchIncoming());
    const refresh = () => { if (document.visibilityState === 'visible') dispatch(refreshIncoming()); };
    const timer = setInterval(refresh, FRIEND_REQUEST_POLL_MS);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [accessToken, dispatch]);
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
      {/* User summary — only shown when logged in */}
      {user && (
        <>
          <Box
            sx={{ px: 2, py: 2, cursor: 'pointer' }}
            onClick={() => handleNav('/profile', true)}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <UserAvatar user={{ ...user, isOnline: true }} size={44} showOnline />
              <Box minWidth={0}>
                <Typography variant="subtitle2" fontWeight={700} noWrap>{user.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>{user.email}</Typography>
              </Box>
            </Stack>
          </Box>
          <Divider sx={{ mx: 2 }} />
        </>
      )}

      {/* Nav */}
      <List sx={{ px: 1, flex: 1, pt: 1 }}>
        {[
          ...navItems,
          // Content reviewers and admins (the review API re-checks the role)
          ...(user?.role === 'reviewer' || user?.role === 'admin' ? [{ label: 'Review queue', icon: FactCheck, path: '/review', auth: true }] : []),
        ].map(({ label, icon: Icon, path, auth }) => {
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
                  <Badge badgeContent={badge} color="error">
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

      </List>

      {/* Footer — info pages. Below md the fixed bottom nav (56px, zIndex 1300) sits over the
          drawer, so lift the footer above it, including the iPhone home-indicator safe area. */}
      <Box sx={{ px: 2, pb: { xs: 'calc(56px + 16px + env(safe-area-inset-bottom))', md: 2 } }}>
        <Box component="nav" aria-label="About Meenzo" sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.5, mb: 0.75 }}>
          {[
            { label: 'About Us',       path: '/about' },
            { label: 'Privacy Policy', path: '/privacy-policy' },
            { label: 'Contact Us',     path: '/contact' },
          ].map(({ label, path }) => (
            <Typography
              key={path}
              component="a"
              href={path}
              variant="caption"
              onClick={(e) => { e.preventDefault(); handleNav(path, false); }}
              sx={{
                color: location.pathname === path ? 'primary.main' : 'text.secondary',
                fontWeight: location.pathname === path ? 700 : 500,
                textDecoration: 'none',
                cursor: 'pointer',
                '&:hover': { color: 'text.primary', textDecoration: 'underline' },
              }}
            >
              {label}
            </Typography>
          ))}
        </Box>
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
