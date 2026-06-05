import { Card, CardContent, Stack, Box, Typography, Button } from '@mui/material';
import { PersonAdd, Check, Close, PersonRemove } from '@mui/icons-material';
import type { Friend } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import { acceptRequest, rejectRequest, sendRequest, cancelRequest, unfriend } from '../../store/slices/friendsSlice';
import { UserAvatar } from './UserAvatar';

interface Props {
  friend: Friend;
  compact?: boolean;
}

export function FriendCard({ friend, compact = false }: Props) {
  const dispatch = useAppDispatch();
  const { user, status, mutualFriends } = friend;

  const actions = () => {
    if (status === 'friend') {
      return (
        <Button size="small" variant="outlined" color="error" startIcon={<PersonRemove />}
          onClick={() => dispatch(unfriend(friend.id))}>
          Unfriend
        </Button>
      );
    }
    if (status === 'pending_received') {
      return (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="contained" startIcon={<Check />}
            onClick={() => dispatch(acceptRequest(friend.id))}>
            Accept
          </Button>
          <Button size="small" variant="outlined" startIcon={<Close />}
            onClick={() => dispatch(rejectRequest(friend.id))}>
            Decline
          </Button>
        </Stack>
      );
    }
    if (status === 'pending_sent') {
      return (
        <Button size="small" variant="outlined"
          onClick={() => dispatch(cancelRequest(friend.id))}>
          Cancel Request
        </Button>
      );
    }
    return (
      <Button size="small" variant="contained" startIcon={<PersonAdd />}
        onClick={() => dispatch(sendRequest(friend.id))}>
        Add Friend
      </Button>
    );
  };

  return (
    <Card sx={{ mb: compact ? 1 : 1.5 }}>
      <CardContent sx={{ py: compact ? 1.5 : 2, '&:last-child': { pb: compact ? 1.5 : 2 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <UserAvatar user={user} size={compact ? 44 : 52} showOnline />
          <Box flex={1} minWidth={0}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>{user.name}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>@{user.username}</Typography>
            {mutualFriends !== undefined && (
              <Typography variant="caption" color="text.secondary" display="block">
                {mutualFriends} mutual friends
              </Typography>
            )}
          </Box>
          {actions()}
        </Stack>
      </CardContent>
    </Card>
  );
}
