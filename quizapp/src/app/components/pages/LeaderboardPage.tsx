import { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Stack, Card, CardContent,
  Avatar, Chip, LinearProgress,
} from '@mui/material';
import { EmojiEvents, WorkspacePremium } from '@mui/icons-material';
import { mockLeaderboard } from '../../data/mockData';
import { UserAvatar } from '../shared/UserAvatar';
import { useAppSelector } from '../../store/hooks';

const medalColors = ['#f59e0b', '#9ca3af', '#b45309'];
const medalEmojis = ['🥇', '🥈', '🥉'];

export function LeaderboardPage() {
  const [period, setPeriod] = useState(0);
  const { user } = useAppSelector((s) => s.auth);
  const periods = ['Weekly', 'Monthly', 'All Time'];
  const topThree = mockLeaderboard.slice(0, 3);
  const rest = mockLeaderboard.slice(3);
  const maxScore = mockLeaderboard[0].score;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" mb={3}>
        <EmojiEvents sx={{ color: 'warning.main', fontSize: 28 }} />
        <Typography variant="h5" fontWeight={800}>Leaderboard</Typography>
      </Stack>

      {/* Podium */}
      <Card sx={{ mb: 3, overflow: 'visible' }}>
        <CardContent>
          <Stack direction="row" alignItems="flex-end" justifyContent="center" spacing={2} sx={{ pt: 2 }}>
            {/* 2nd */}
            <Stack alignItems="center" spacing={1}>
              <UserAvatar user={topThree[1].user} size={56} />
              <Typography fontSize={20}>🥈</Typography>
              <Box
                sx={{
                  width: 80, bgcolor: '#9ca3af20',
                  border: '2px solid #9ca3af',
                  borderBottom: 'none',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pt: 1, pb: 0.5,
                  height: 80,
                }}
              >
                <Typography variant="caption" fontWeight={700} textAlign="center" noWrap sx={{ px: 0.5, maxWidth: '100%' }}>
                  {topThree[1].user.name.split(' ')[0]}
                </Typography>
                <Typography variant="caption" color="text.secondary">{topThree[1].score.toLocaleString()}</Typography>
              </Box>
            </Stack>

            {/* 1st */}
            <Stack alignItems="center" spacing={1}>
              <WorkspacePremium sx={{ color: '#f59e0b', fontSize: 28 }} />
              <UserAvatar user={topThree[0].user} size={72} />
              <Typography fontSize={24}>🥇</Typography>
              <Box
                sx={{
                  width: 88, bgcolor: '#f59e0b20',
                  border: '2px solid #f59e0b',
                  borderBottom: 'none',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pt: 1, pb: 0.5,
                  height: 100,
                }}
              >
                <Typography variant="caption" fontWeight={700} textAlign="center" noWrap sx={{ px: 0.5, maxWidth: '100%' }}>
                  {topThree[0].user.name.split(' ')[0]}
                </Typography>
                <Typography variant="caption" color="warning.main" fontWeight={700}>{topThree[0].score.toLocaleString()}</Typography>
              </Box>
            </Stack>

            {/* 3rd */}
            <Stack alignItems="center" spacing={1}>
              <UserAvatar user={topThree[2].user} size={52} />
              <Typography fontSize={18}>🥉</Typography>
              <Box
                sx={{
                  width: 80, bgcolor: '#b4530920',
                  border: '2px solid #b45309',
                  borderBottom: 'none',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pt: 1, pb: 0.5,
                  height: 65,
                }}
              >
                <Typography variant="caption" fontWeight={700} textAlign="center" noWrap sx={{ px: 0.5, maxWidth: '100%' }}>
                  {topThree[2].user.name.split(' ')[0]}
                </Typography>
                <Typography variant="caption" color="text.secondary">{topThree[2].score.toLocaleString()}</Typography>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Period Tabs */}
      <Tabs value={period} onChange={(_, v) => setPeriod(v)} sx={{ mb: 2 }}>
        {periods.map((p) => <Tab key={p} label={p} sx={{ fontWeight: 600 }} />)}
      </Tabs>

      {/* Full Rankings */}
      <Stack spacing={1}>
        {mockLeaderboard.map((entry) => {
          const isCurrentUser = user && entry.user.id === user.id;
          return (
            <Card
              key={entry.rank}
              sx={{
                border: isCurrentUser ? '2px solid' : '1px solid',
                borderColor: isCurrentUser ? 'primary.main' : 'divider',
              }}
            >
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    sx={{
                      width: 36,
                      color: entry.rank <= 3 ? medalColors[entry.rank - 1] : 'text.secondary',
                      textAlign: 'center',
                    }}
                  >
                    {entry.rank <= 3 ? medalEmojis[entry.rank - 1] : entry.rank}
                  </Typography>
                  <UserAvatar user={entry.user} size={44} showOnline />
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {entry.user.name}
                      </Typography>
                      {isCurrentUser && <Chip label="You" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />}
                    </Stack>
                    <Box sx={{ mt: 0.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(entry.score / maxScore) * 100}
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                    </Box>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                      {entry.score.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {entry.quizzesTaken} quizzes
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
