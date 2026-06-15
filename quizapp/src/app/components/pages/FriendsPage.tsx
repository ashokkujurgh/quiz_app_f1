import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box, Typography, Tabs, Tab, Stack, Avatar, Button, CircularProgress,
} from '@mui/material';
import { PersonAdd, PersonRemove, Check, Close, People, Chat } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchFriends, fetchIncoming, fetchOutgoing, fetchSuggestions,
  sendFriendRequest, acceptFriendRequest, declineFriendRequest,
  cancelFriendRequest, unfriendUser,
  type FriendUser, type IncomingRequest, type OutgoingRequest,
} from '../../store/slices/friendsSlice';
import { openConversation } from '../../store/slices/messagesSlice';
import { EmptyState } from '../shared/EmptyState';

function UserRow({
  user,
  actions,
}: {
  user: FriendUser;
  actions: React.ReactNode;
}) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" py={1.5}
      sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar src={user.avatar ?? undefined} sx={{ width: 44, height: 44 }}>
          {user.username[0].toUpperCase()}
        </Avatar>
        <Box>
          <Typography fontWeight={600} fontSize={14}>{user.username}</Typography>
          <Typography variant="caption" color="text.secondary">{user.email}</Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1}>{actions}</Stack>
    </Stack>
  );
}

export function FriendsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { friends, incoming, outgoing, suggestions, loading } = useAppSelector((s) => s.friends);
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const handleMessage = async (userId: string) => {
    await dispatch(openConversation(userId)).unwrap();
    navigate('/messages');
  };

  useEffect(() => {
    dispatch(fetchFriends());
    dispatch(fetchIncoming());
    dispatch(fetchOutgoing());
    dispatch(fetchSuggestions());
  }, [dispatch]);

  const withBusy = (id: string, fn: () => Promise<unknown>) => async () => {
    setBusy((p) => ({ ...p, [id]: true }));
    try { await fn(); } finally { setBusy((p) => ({ ...p, [id]: false })); }
  };

  const tabs = [
    `Friends (${friends.length})`,
    `Requests (${incoming.length})`,
    `Sent (${outgoing.length})`,
    `Suggestions (${suggestions.length})`,
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} mb={2}>Friends</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        {tabs.map((label) => (
          <Tab key={label} label={label} sx={{ fontWeight: 600, textTransform: 'none' }} />
        ))}
      </Tabs>

      {loading && <Box textAlign="center" py={4}><CircularProgress /></Box>}

      {/* Friends */}
      {tab === 0 && !loading && (
        friends.length === 0
          ? <EmptyState icon={People} title="No friends yet" description="Add friends from suggestions" />
          : friends.map((u) => (
              <UserRow key={u._id} user={u} actions={<>
                <Button size="small" variant="contained"
                  startIcon={<Chat />}
                  onClick={() => handleMessage(u._id)}>
                  Message
                </Button>
                <Button size="small" color="error" variant="outlined"
                  startIcon={<PersonRemove />}
                  disabled={busy[u._id]}
                  onClick={withBusy(u._id, () => dispatch(unfriendUser(u._id)).unwrap())}>
                  Unfriend
                </Button>
              </>} />
            ))
      )}

      {/* Incoming requests */}
      {tab === 1 && !loading && (
        incoming.length === 0
          ? <EmptyState icon={People} title="No pending requests" description="Check back later" />
          : (incoming as IncomingRequest[]).map((r) => r.user && (
              <UserRow key={r.requestId} user={r.user} actions={<>
                <Button size="small" variant="contained" color="primary"
                  startIcon={<Check />}
                  disabled={busy[r.requestId]}
                  onClick={withBusy(r.requestId, () => dispatch(acceptFriendRequest(r.requestId)).unwrap())}>
                  Accept
                </Button>
                <Button size="small" variant="outlined" color="error"
                  startIcon={<Close />}
                  disabled={busy[r.requestId]}
                  onClick={withBusy(r.requestId, () => dispatch(declineFriendRequest(r.requestId)).unwrap())}>
                  Decline
                </Button>
              </>} />
            ))
      )}

      {/* Sent requests */}
      {tab === 2 && !loading && (
        outgoing.length === 0
          ? <EmptyState icon={People} title="No sent requests" description="Send a request from suggestions" />
          : (outgoing as OutgoingRequest[]).map((r) => r.user && (
              <UserRow key={r.requestId} user={r.user} actions={
                <Button size="small" variant="outlined"
                  disabled={busy[r.user._id]}
                  onClick={withBusy(r.user._id, () => dispatch(cancelFriendRequest(r.user._id)).unwrap())}>
                  Cancel
                </Button>
              } />
            ))
      )}

      {/* Suggestions */}
      {tab === 3 && !loading && (
        suggestions.length === 0
          ? <EmptyState icon={People} title="No suggestions" description="You're all caught up!" />
          : suggestions.map((u) => (
              <UserRow key={u._id} user={u} actions={
                <Button size="small" variant="contained"
                  startIcon={<PersonAdd />}
                  disabled={busy[u._id]}
                  onClick={withBusy(u._id, () => dispatch(sendFriendRequest(u._id)).unwrap())}>
                  Add Friend
                </Button>
              } />
            ))
      )}
    </Box>
  );
}
