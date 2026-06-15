import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box, Typography, Tabs, Tab, Stack, Card, CardContent,
  Button, Avatar, Grid, CircularProgress, Chip,
} from '@mui/material';
import {
  PersonAdd, PersonRemove, Chat, Check, Article, People,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { apiFetch } from '../../utils/apiFetch';
import { openConversation } from '../../store/slices/messagesSlice';
import { sendFriendRequest, unfriendUser, type FriendUser } from '../../store/slices/friendsSlice';
import { useOnlineUsers } from '../../context/OnlineUsersContext';

interface PublicUser {
  _id: string;
  name?: string;
  username: string;
  email: string;
  avatar?: string | null;
  coverImage?: string | null;
  role?: string;
}

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate   = useNavigate();
  const dispatch   = useAppDispatch();
  const { isOnline } = useOnlineUsers();
  const myId    = useAppSelector((s) => s.auth.user?.id);
  const friends = useAppSelector((s) => s.friends.friends);

  const [profile, setProfile]       = useState<PublicUser | null>(null);
  const [loading, setLoading]       = useState(true);
  const [relStatus, setRelStatus]   = useState<string>('none');
  const [userFriends, setUserFriends] = useState<FriendUser[]>([]);
  const [tab, setTab]               = useState(0);
  const [busy, setBusy]             = useState(false);

  // Redirect own profile
  useEffect(() => {
    if (userId && myId && userId === myId) { navigate('/profile', { replace: true }); }
  }, [userId, myId, navigate]);

  // Fetch user profile
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    apiFetch(`/api/auth/users/${userId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setProfile(d.user); })
      .finally(() => setLoading(false));
  }, [userId]);

  // Fetch relationship status
  useEffect(() => {
    if (!userId) return;
    apiFetch(`/api/friends/status/${userId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setRelStatus(d.status); })
      .catch(() => {});
  }, [userId, friends]);

  // Fetch user's friends (for Friends tab)
  useEffect(() => {
    if (!userId) return;
    apiFetch(`/api/friends?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setUserFriends(d.data ?? []); })
      .catch(() => {});
  }, [userId]);

  const handleMessage = async () => {
    if (!userId) return;
    await dispatch(openConversation(userId)).unwrap();
    navigate('/messages');
  };

  const handleAddFriend = async () => {
    if (!userId) return;
    setBusy(true);
    try { await dispatch(sendFriendRequest(userId)).unwrap(); setRelStatus('request_sent'); }
    catch { /* ignore */ } finally { setBusy(false); }
  };

  const handleUnfriend = async () => {
    if (!userId) return;
    setBusy(true);
    try { await dispatch(unfriendUser(userId)).unwrap(); setRelStatus('none'); }
    catch { /* ignore */ } finally { setBusy(false); }
  };

  if (loading) {
    return <Box textAlign="center" py={10}><CircularProgress /></Box>;
  }
  if (!profile) {
    return <Box py={8} textAlign="center"><Typography color="text.secondary">User not found.</Typography></Box>;
  }

  const isFriend         = relStatus === 'accepted';
  const displayName      = profile.name ?? profile.username;
  const online           = isOnline(profile._id);

  return (
    <Box>
      {/* Cover + Avatar card */}
      <Card sx={{ mb: 2, overflow: 'hidden' }}>
        {/* Cover */}
        <Box sx={{
          height: 180,
          background: profile.coverImage
            ? `url(${profile.coverImage}) center/cover no-repeat`
            : 'linear-gradient(135deg, #5563DE 0%, #E91E8C 100%)',
        }} />

        <CardContent sx={{ pt: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mt: -5, mb: 2 }}>
            {/* Avatar with online dot */}
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={profile.avatar ?? undefined}
                sx={{ width: 90, height: 90, border: '4px solid', borderColor: 'background.paper', fontSize: 36 }}
              >
                {displayName[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{
                position: 'absolute', bottom: 4, right: 4,
                width: 14, height: 14, borderRadius: '50%',
                bgcolor: online ? 'success.main' : 'text.disabled',
                border: '2px solid white',
              }} />
            </Box>

            {/* Action buttons */}
            <Stack direction="row" spacing={1}>
              {isFriend ? (
                <>
                  <Button variant="contained" size="small" startIcon={<Chat />} onClick={handleMessage}>
                    Message
                  </Button>
                  <Button variant="outlined" size="small" color="error" startIcon={<PersonRemove />}
                    disabled={busy} onClick={handleUnfriend}>
                    Unfriend
                  </Button>
                </>
              ) : relStatus === 'request_sent' ? (
                <Button variant="outlined" size="small" startIcon={<Check />} disabled>
                  Request Sent
                </Button>
              ) : relStatus === 'request_received' ? (
                <Button variant="outlined" size="small" disabled>
                  Respond in Friends
                </Button>
              ) : (
                <Button variant="contained" size="small" startIcon={<PersonAdd />}
                  disabled={busy} onClick={handleAddFriend}>
                  Add Friend
                </Button>
              )}
            </Stack>
          </Stack>

          {/* Name + username */}
          <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
            <Typography variant="h6" fontWeight={800}>{displayName}</Typography>
            {profile.role === 'admin' && <Chip label="Admin" size="small" color="primary" />}
          </Stack>
          <Typography variant="body2" color="text.secondary">@{profile.username}</Typography>

          {/* Stats row */}
          <Stack direction="row" spacing={3} mt={2} flexWrap="wrap">
            {[
              { label: 'Friends', value: userFriends.length },
              { label: 'Posts',   value: 0 },
              { label: 'Quizzes', value: 0 },
              { label: 'Avg Score', value: '0%' },
            ].map(({ label, value }) => (
              <Box key={label} textAlign="center">
                <Typography variant="h6" fontWeight={800}>{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab icon={<Article />} label="Posts"   iconPosition="start" sx={{ fontWeight: 600 }} />
        <Tab icon={<People />}  label="Friends" iconPosition="start" sx={{ fontWeight: 600 }} />
      </Tabs>

      {/* Posts tab */}
      {tab === 0 && (
        <Typography color="text.secondary" textAlign="center" py={4}>No posts yet.</Typography>
      )}

      {/* Friends tab */}
      {tab === 1 && (
        userFriends.length === 0
          ? <Typography color="text.secondary" textAlign="center" py={4}>No friends yet.</Typography>
          : (
            <Grid container spacing={2}>
              {userFriends.map((f) => (
                <Grid item xs={12} sm={6} key={f._id}>
                  <Card sx={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${f._id}`)}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ position: 'relative' }}>
                          <Avatar src={f.avatar ?? undefined} sx={{ width: 48, height: 48 }}>
                            {f.username[0]?.toUpperCase()}
                          </Avatar>
                          <Box sx={{
                            position: 'absolute', bottom: 1, right: 1,
                            width: 11, height: 11, borderRadius: '50%',
                            bgcolor: isOnline(f._id) ? 'success.main' : 'text.disabled',
                            border: '2px solid white',
                          }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>{f.username}</Typography>
                          <Typography variant="caption" color="text.secondary">{f.email}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )
      )}
    </Box>
  );
}
