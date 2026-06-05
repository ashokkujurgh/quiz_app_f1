import { useNavigate } from 'react-router';
import {
  Box, Typography, Stack, Divider, Button, Avatar,
  LinearProgress, Chip,
} from '@mui/material';
import { TrendingUp, PersonAdd, EmojiEvents } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { mockLeaderboard } from '../../data/mockData';
import { TopicChip, topicColors } from '../shared/TopicChip';
import { UserAvatar } from '../shared/UserAvatar';

const trendingTopics = [
  { topic: 'Physics', posts: 128 },
  { topic: 'Technology', posts: 94 },
  { topic: 'Mathematics', posts: 76 },
  { topic: 'History', posts: 61 },
  { topic: 'Chemistry', posts: 55 },
];

export function RightSidebar() {
  const navigate = useNavigate();
  const friends = useAppSelector((s) => s.friends.friends);
  const suggested = friends.filter((f) => f.status === 'suggested').slice(0, 3);
  const topPlayers = mockLeaderboard.slice(0, 5);

  return (
    <Box sx={{ width: 280, flexShrink: 0, display: { xs: 'none', lg: 'block' } }}>
      <Box sx={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Trending Topics */}
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 2, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
            <TrendingUp color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>Trending Topics</Typography>
          </Stack>
          <Stack spacing={1}>
            {trendingTopics.map((t) => (
              <Stack key={t.topic} direction="row" justifyContent="space-between" alignItems="center">
                <TopicChip topic={t.topic as any} />
                <Typography variant="caption" color="text.secondary">{t.posts} posts</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Suggested Friends */}
        {suggested.length > 0 && (
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <PersonAdd color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700}>People You May Know</Typography>
            </Stack>
            <Stack spacing={1.5}>
              {suggested.map((f) => (
                <Stack key={f.id} direction="row" spacing={1.5} alignItems="center">
                  <UserAvatar user={f.user} size={36} showOnline />
                  <Box flex={1} minWidth={0}>
                    <Typography variant="caption" fontWeight={700} noWrap display="block">{f.user.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{f.mutualFriends} mutual</Typography>
                  </Box>
                  <Button size="small" variant="outlined" sx={{ fontSize: '0.65rem', py: 0.25, px: 1, minWidth: 0 }}>
                    Add
                  </Button>
                </Stack>
              ))}
            </Stack>
            <Button fullWidth size="small" sx={{ mt: 1.5 }} onClick={() => navigate('/friends')}>
              See More
            </Button>
          </Box>
        )}

        {/* Top Players */}
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 2, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
            <EmojiEvents sx={{ color: 'warning.main', fontSize: 18 }} />
            <Typography variant="subtitle2" fontWeight={700}>Top Players</Typography>
          </Stack>
          <Stack spacing={1}>
            {topPlayers.map((entry) => (
              <Stack key={entry.rank} direction="row" spacing={1.5} alignItems="center">
                <Typography
                  variant="caption"
                  fontWeight={800}
                  sx={{
                    width: 20,
                    color: entry.rank === 1 ? '#f59e0b' : entry.rank === 2 ? '#9ca3af' : entry.rank === 3 ? '#b45309' : 'text.secondary',
                  }}
                >
                  #{entry.rank}
                </Typography>
                <UserAvatar user={entry.user} size={28} />
                <Typography variant="caption" fontWeight={600} flex={1} noWrap>{entry.user.name}</Typography>
                <Typography variant="caption" color="primary.main" fontWeight={700}>
                  {entry.score.toLocaleString()}
                </Typography>
              </Stack>
            ))}
          </Stack>
          <Button fullWidth size="small" sx={{ mt: 1.5 }} onClick={() => navigate('/leaderboard')}>
            Full Leaderboard
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
