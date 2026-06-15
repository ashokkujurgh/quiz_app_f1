import { useEffect, useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Stack, Card, CardContent, Button,
  Avatar, Grid, CircularProgress,
} from '@mui/material';
import { Edit, Quiz, People, Article } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useAppSelector } from '../../store/hooks';
import { apiFetch } from '../../utils/apiFetch';
import { PostCard } from '../shared/PostCard';
import { TopicChip } from '../shared/TopicChip';
import { UserAvatar } from '../shared/UserAvatar';
import type { Post, QuizTopic } from '../../types';

interface GameHistoryEntry {
  _id: string;
  quizId: string;
  quizTitle: string;
  category?: string;
  score: number;
  total: number;
  percentage: number;
  rank: number;
  completedAt: string;
}

interface FriendUser {
  _id: string;
  username: string;
  avatar: string | null;
  email: string;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);

  const [tab, setTab]         = useState(0);
  const [posts, setPosts]     = useState<Post[]>([]);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/posts/user/${user.id}`).then((r) => r.json()).then((d) => {
        const raw = (d.posts ?? []) as Record<string, unknown>[];
        setPosts(raw.map((p) => {
          const a = (p['author'] as Record<string, unknown>) ?? {};
          return {
            id: (p['_id'] ?? p['id']) as string,
            title: (p['title'] as string | null) ?? null,
            author: {
              id: String(a['userId'] ?? a['_id'] ?? ''),
              name: (a['name'] ?? '') as string,
              username: (a['username'] ?? '') as string,
              email: (a['email'] ?? '') as string,
              avatar: a['avatar'] as string | undefined,
              isOnline: false,
              role: 'user' as const,
              stats: { friends: 0, posts: 0, quizzesTaken: 0, averageScore: 0 },
              joinedAt: (p['createdAt'] ?? new Date().toISOString()) as string,
            },
            content: p['content'] as string,
            image: p['image'] as string | undefined,
            images: p['images'] as string[] | undefined,
            topic: (p['topic'] ?? 'General') as QuizTopic,
            subTopic: (p['subTopic'] as string | null) ?? null,
            userType: (p['userType'] as 'user' | 'admin') ?? 'user',
            timestamp: (p['createdAt'] ?? new Date().toISOString()) as string,
            likes: (p['likes'] as number) ?? 0,
            comments: (p['commentsCount'] as number) ?? 0,
            shares: (p['shares'] as number) ?? 0,
            liked: (p['liked'] as boolean) ?? false,
            saved: (p['saved'] as boolean) ?? false,
          } satisfies Post;
        }));
      }),
      apiFetch('/api/quizzes/my/history').then((r) => r.json()).then((d) => setHistory(d.history ?? [])),
      apiFetch('/api/friends').then((r) => r.json()).then((d) => setFriends(d.data ?? [])),
    ]).finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const avgScore = history.length
    ? Math.round(history.reduce((s, h) => s + h.percentage, 0) / history.length)
    : 0;

  return (
    <Box>
      {/* Cover + Avatar card */}
      <Card sx={{ mb: 2, overflow: 'hidden', position: 'relative' }}>
        <Box sx={{
          height: 180,
          background: user.coverImage
            ? `url(${user.coverImage}) center/cover no-repeat`
            : 'linear-gradient(135deg, #5563DE 0%, #E91E8C 100%)',
        }} />

        <CardContent sx={{ pt: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mt: -5, mb: 2 }}>
            <Box sx={{ position: 'relative' }}>
              <UserAvatar user={user} size={90} sx={{ border: '4px solid', borderColor: 'background.paper' }} />
              <Box sx={{
                position: 'absolute', bottom: 4, right: 4,
                width: 14, height: 14, borderRadius: '50%',
                bgcolor: 'success.main', border: '2px solid white',
              }} />
            </Box>
            <Button variant="outlined" startIcon={<Edit />} size="small"
              onClick={() => navigate('/settings')}>
              Edit Profile
            </Button>
          </Stack>

          <Typography variant="h6" fontWeight={800}>{user.name}</Typography>
          <Typography variant="body2" color="text.secondary">@{user.username}</Typography>
          {user.bio && <Typography variant="body2" sx={{ mt: 1 }}>{user.bio}</Typography>}

          {/* Stats */}
          <Stack direction="row" spacing={3} mt={2} flexWrap="wrap">
            {[
              { label: 'Friends',   value: friends.length },
              { label: 'Posts',     value: posts.length },
              { label: 'Quizzes',   value: history.length },
              { label: 'Avg Score', value: loading ? '…' : `${avgScore}%` },
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
        <Tab icon={<Article />} label="Posts"        iconPosition="start" sx={{ fontWeight: 600 }} />
        <Tab icon={<Quiz />}    label="Quiz Results" iconPosition="start" sx={{ fontWeight: 600 }} />
        <Tab icon={<People />}  label="Friends"      iconPosition="start" sx={{ fontWeight: 600 }} />
      </Tabs>

      {loading && <Box textAlign="center" py={4}><CircularProgress /></Box>}

      {/* Posts */}
      {!loading && tab === 0 && (
        posts.length === 0
          ? <Typography color="text.secondary" textAlign="center" py={4}>No posts yet.</Typography>
          : posts.map((p) => <PostCard key={p.id} post={p} />)
      )}

      {/* Quiz Results */}
      {!loading && tab === 1 && (
        history.length === 0
          ? <Typography color="text.secondary" textAlign="center" py={4}>No quiz history yet.</Typography>
          : (
            <Stack spacing={1.5}>
              {history.map((r) => (
                <Card key={r._id}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{
                        width: 52, height: 52, borderRadius: 2, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: r.percentage >= 80 ? 'success.main' : r.percentage >= 60 ? 'warning.main' : 'error.main',
                        color: 'white',
                      }}>
                        <Typography fontWeight={800} fontSize={13}>{r.percentage}%</Typography>
                      </Box>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap>{r.quizTitle}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {r.category && <TopicChip topic={r.category} />}
                          <Typography variant="caption" color="text.secondary">
                            {new Date(r.completedAt).toLocaleDateString()}
                          </Typography>
                        </Stack>
                      </Box>
                      <Box textAlign="right" flexShrink={0}>
                        <Typography variant="body2" fontWeight={700}>{r.score}/{r.total}</Typography>
                        <Typography variant="caption" color="text.secondary">Rank #{r.rank}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )
      )}

      {/* Friends */}
      {!loading && tab === 2 && (
        friends.length === 0
          ? <Typography color="text.secondary" textAlign="center" py={4}>No friends yet.</Typography>
          : (
            <Grid container spacing={2}>
              {friends.map((f) => (
                <Grid item xs={12} sm={6} key={f._id}>
                  <Card sx={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${f._id}`)}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar src={f.avatar ?? undefined} sx={{ width: 48, height: 48 }}>
                          {f.username[0]?.toUpperCase()}
                        </Avatar>
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
