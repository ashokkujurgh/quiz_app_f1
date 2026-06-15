import { Box, Typography, Stack, Badge, ListItemButton } from '@mui/material';
import type { Chat } from '../../types';
import { UserAvatar } from './UserAvatar';
import { formatDistanceToNow } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveConv } from '../../store/slices/messagesSlice';

interface Props {
  chat: Chat;
}

export function ChatCard({ chat }: Props) {
  const dispatch = useAppDispatch();
  const activeChatId = useAppSelector((s) => s.messages.activeChatId);
  const isActive = activeChatId === chat.id;

  return (
    <ListItemButton
      selected={isActive}
      onClick={() => dispatch(setActiveConv(chat.id))}
      sx={{ borderRadius: 2, px: 1.5, py: 1, mb: 0.5 }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" width="100%">
        <UserAvatar user={chat.participant} size={44} showOnline />
        <Box flex={1} minWidth={0}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={700} noWrap>{chat.participant.name}</Typography>
            {chat.lastMessage && (
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, ml: 1 }}>
                {formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: false })}
              </Typography>
            )}
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
              {chat.isTyping ? (
                <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>typing...</Box>
              ) : (
                chat.lastMessage?.content ?? 'No messages yet'
              )}
            </Typography>
            {chat.unreadCount > 0 && (
              <Badge badgeContent={chat.unreadCount} color="primary" sx={{ ml: 1, '& .MuiBadge-badge': { position: 'relative', transform: 'none' } }} />
            )}
          </Stack>
        </Box>
      </Stack>
    </ListItemButton>
  );
}
