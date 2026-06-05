import { useNavigate, useLocation } from 'react-router';
import { Paper, BottomNavigation, BottomNavigationAction, Badge } from '@mui/material';
import { Home, Quiz, People, Message, Person } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const unreadMessages = useAppSelector((s) => s.messages.chats.reduce((a, c) => a + c.unreadCount, 0));

  const items = [
    { label: 'Home', icon: <Home />, path: '/home' },
    { label: 'Quiz', icon: <Quiz />, path: '/quizzes' },
    { label: 'Friends', icon: <People />, path: '/friends' },
    {
      label: 'Messages',
      icon: <Badge badgeContent={unreadMessages} color="primary"><Message /></Badge>,
      path: '/messages',
    },
    { label: 'Profile', icon: <Person />, path: '/profile' },
  ];

  const currentValue = items.findIndex((i) => location.pathname.startsWith(i.path));

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 1300,
        display: { md: 'none' },
        borderTop: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}
      elevation={0}
    >
      <BottomNavigation
        value={currentValue >= 0 ? currentValue : 0}
        onChange={(_, newValue) => navigate(items[newValue].path)}
        showLabels
      >
        {items.map(({ label, icon }) => (
          <BottomNavigationAction key={label} label={label} icon={icon} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
