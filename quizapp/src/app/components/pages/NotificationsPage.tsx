import {
  Box, Typography, Stack, Card, CardContent, Button,
  Chip, Divider,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { markAllRead, markRead } from '../../store/slices/notificationsSlice';
import { UserAvatar } from '../shared/UserAvatar';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from '../shared/EmptyState';
import { Notifications as NotifIcon } from '@mui/icons-material';

const typeLabels: Record<string, { emoji: string; label: string; color: string }> = {
  like: { emoji: '❤️', label: 'Like', color: '#ef4444' },
  comment: { emoji: '💬', label: 'Comment', color: '#3b82f6' },
  friend_request: { emoji: '👥', label: 'Friend Request', color: '#5563DE' },
  message: { emoji: '✉️', label: 'Message', color: '#22c55e' },
  quiz_challenge: { emoji: '🎯', label: 'Challenge', color: '#f59e0b' },
};

export function NotificationsPage() {
  const dispatch = useAppDispatch();
  const { notifications } = useAppSelector((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={800}>Notifications</Typography>
        {unread > 0 && (
          <Button size="small" variant="outlined" onClick={() => dispatch(markAllRead())}>
            Mark All Read
          </Button>
        )}
      </Stack>

      {notifications.length === 0 ? (
        <EmptyState icon={NotifIcon} title="No notifications" description="You're all caught up!" />
      ) : (
        <Stack spacing={1}>
          {notifications.map((n, idx) => {
            const meta = typeLabels[n.type];
            return (
              <Card
                key={n.id}
                onClick={() => dispatch(markRead(n.id))}
                sx={{
                  cursor: 'pointer',
                  bgcolor: n.read ? 'background.paper' : 'primary.main',
                  background: n.read ? undefined : 'rgba(85,99,222,0.06)',
                  border: n.read ? undefined : '1px solid',
                  borderColor: n.read ? undefined : 'primary.main',
                  borderOpacity: 0.3,
                  '&:hover': { bgcolor: 'action.hover' },
                  transition: 'background-color 0.15s',
                }}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ position: 'relative', flexShrink: 0 }}>
                      <UserAvatar user={n.actor} size={44} />
                      <Box
                        sx={{
                          position: 'absolute', bottom: -2, right: -2,
                          fontSize: 16, lineHeight: 1,
                          bgcolor: 'background.paper',
                          borderRadius: '50%',
                          width: 22, height: 22,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        {meta.emoji}
                      </Box>
                    </Box>
                    <Box flex={1}>
                      <Typography variant="body2">
                        <strong>{n.actor.name}</strong> {n.content}
                      </Typography>
                      <Stack direction="row" spacing={1} mt={0.25} alignItems="center">
                        <Chip
                          label={meta.label}
                          size="small"
                          sx={{ height: 18, fontSize: '0.62rem', bgcolor: `${meta.color}18`, color: meta.color }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                        </Typography>
                      </Stack>
                    </Box>
                    {!n.read && (
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
