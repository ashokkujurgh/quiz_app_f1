import { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Stack, Card, CardContent, Button,
  Avatar, Chip, Grid, Divider, LinearProgress,
} from '@mui/material';
import { Edit, EmojiEvents, Quiz, People, Article } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { mockHistory, mockFriends, mockPosts } from '../../data/mockData';
import { PostCard } from '../shared/PostCard';
import { TopicChip } from '../shared/TopicChip';
import { UserAvatar } from '../shared/UserAvatar';

const achievements = [
  { emoji: '🏆', title: 'Top 10 All Time', desc: 'Reached top 10 on leaderboard' },
  { emoji: '🔥', title: '7-Day Streak', desc: 'Completed quizzes 7 days in a row' },
  { emoji: '⚡', title: 'Speed Demon', desc: 'Completed a quiz in under 2 minutes' },
  { emoji: '🎯', title: 'Perfect Score', desc: 'Got 100% on 5 quizzes' },
];

export function ProfilePage() {
  const [tab, setTab] = useState(0);
  const { user } = useAppSelector((s) => s.auth);
  const posts = useAppSelector((s) => s.posts.posts);
  const myPosts = posts.filter((p) => p.author.id === user?.id);

  if (!user) return null;

  return (
    <Box>
      {/* Cover + Avatar */}
      <Card sx={{ mb: 2, overflow: 'hidden', position: 'relative' }}>
        <Box
          sx={{
            height: 180,
            background: 'linear-gradient(135deg, #5563DE 0%, #E91E8C 100%)',
            backgroundImage: user.coverImage ? `url(${user.coverImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        />
        <CardContent sx={{ pt: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mt: -5, mb: 2 }}>
            <Box sx={{ position: 'relative' }}>
              <UserAvatar user={user} size={90} sx={{ border: '4px solid', borderColor: 'background.paper' }} />
              <Box
                sx={{
                  position: 'absolute', bottom: 4, right: 4,
                  width: 14, height: 14, borderRadius: '50%',
                  bgcolor: 'success.main',
                  border: '2px solid white',
                }}
              />
            </Box>
            <Button variant="outlined" startIcon={<Edit />} size="small">Edit Profile</Button>
          </Stack>

          <Typography variant="h6" fontWeight={800}>{user.name}</Typography>
          <Typography variant="body2" color="text.secondary">@{user.username}</Typography>
          {user.bio && (
            <Typography variant="body2" sx={{ mt: 1 }}>{user.bio}</Typography>
          )}

          {/* Stats */}
          <Stack direction="row" spacing={3} mt={2} flexWrap="wrap">
            {[
              { label: 'Friends', value: user.stats.friends },
              { label: 'Posts', value: user.stats.posts },
              { label: 'Quizzes', value: user.stats.quizzesTaken },
              { label: 'Avg Score', value: `${user.stats.averageScore}%` },
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
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab icon={<Article />} label="Posts" iconPosition="start" sx={{ fontWeight: 600 }} />
        <Tab icon={<Quiz />} label="Quiz Results" iconPosition="start" sx={{ fontWeight: 600 }} />
        <Tab icon={<EmojiEvents />} label="Achievements" iconPosition="start" sx={{ fontWeight: 600 }} />
        <Tab icon={<People />} label="Friends" iconPosition="start" sx={{ fontWeight: 600 }} />
      </Tabs>

      {/* Posts Tab */}
      {tab === 0 && (
        myPosts.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>No posts yet.</Typography>
        ) : (
          myPosts.map((p) => <PostCard key={p.id} post={p} />)
        )
      )}

      {/* Quiz Results Tab */}
      {tab === 1 && (
        <Stack spacing={1.5}>
          {mockHistory.map((r) => (
            <Card key={r.quizId}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 48, height: 48,
                      borderRadius: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: r.percentage >= 80 ? 'success.main' : r.percentage >= 60 ? 'warning.main' : 'error.main',
                      color: 'white',
                    }}
                  >
                    <Typography fontWeight={800}>{r.percentage}%</Typography>
                  </Box>
                  <Box flex={1}>
                    <Typography variant="subtitle2" fontWeight={700}>{r.quizTitle}</Typography>
                    <Stack direction="row" spacing={1}>
                      <TopicChip topic={r.category} />
                      <Typography variant="caption" color="text.secondary">{r.date}</Typography>
                    </Stack>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="body2" fontWeight={700}>{r.score}/{r.total}</Typography>
                    <Typography variant="caption" color="text.secondary">Rank #{r.rank}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Achievements Tab */}
      {tab === 2 && (
        <Grid container spacing={2}>
          {achievements.map((a) => (
            <Grid item xs={12} sm={6} key={a.title}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography fontSize={36}>{a.emoji}</Typography>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>{a.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.desc}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Friends Tab */}
      {tab === 3 && (
        <Grid container spacing={2}>
          {mockFriends.filter((f) => f.status === 'friend').map((f) => (
            <Grid item xs={12} sm={6} key={f.id}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <UserAvatar user={f.user} size={48} showOnline />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>{f.user.name}</Typography>
                      <Typography variant="caption" color="text.secondary">@{f.user.username}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
