import { useNavigate, useLocation } from 'react-router';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Divider, Stack, Badge, useTheme,
} from '@mui/material';
import {
  Home, Quiz, People, Message, EmojiEvents, History,
  Person, Settings, AdminPanelSettings,
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { UserAvatar } from '../shared/UserAvatar';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Home', icon: Home, path: '/home' },
  { label: 'Quizzes', icon: Quiz, path: '/quizzes' },
  { label: 'Friends', icon: People, path: '/friends' },
  { label: 'Messages', icon: Message, path: '/messages' },
  { label: 'Leaderboard', icon: EmojiEvents, path: '/leaderboard' },
  { label: 'History', icon: History, path: '/history' },
  { label: 'Profile', icon: Person, path: '/profile' },
  { label: 'Settings', icon: Settings, path: '/settings' },
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
  const { user } = useAppSelector((s) => s.auth);
  const unreadMessages = useAppSelector((s) => s.messages.chats.reduce((a, c) => a + c.unreadCount, 0));

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', pt: '64px' }}>
      {/* User summary */}
      {user && (
        <Box
          sx={{ px: 2, py: 2, cursor: 'pointer' }}
          onClick={() => handleNav('/profile')}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <UserAvatar user={user} size={44} showOnline />
            <Box minWidth={0}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>{user.name}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>@{user.username}</Typography>
            </Box>
          </Stack>
        </Box>
      )}
      <Divider sx={{ mx: 2 }} />

      {/* Nav */}
      <List sx={{ px: 1, flex: 1, pt: 1 }}>
        {navItems.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path;
          const badge = label === 'Messages' ? unreadMessages : 0;
          return (
            <ListItemButton
              key={path}
              selected={isActive}
              onClick={() => handleNav(path)}
              sx={{ mb: 0.25, borderRadius: 2, py: 1 }}
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
            </ListItemButton>
          );
        })}

        {user?.role === 'admin' && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItemButton
              selected={location.pathname === '/admin'}
              onClick={() => handleNav('/admin')}
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
          © 2024 QuizHub
        </Typography>
      </Box>
    </Box>
  );

  return (
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
  );
}
