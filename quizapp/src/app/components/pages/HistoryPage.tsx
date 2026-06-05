import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Chip, TextField,
  InputAdornment, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { Search, Timer, CheckCircle, EmojiEvents } from '@mui/icons-material';
import { mockHistory } from '../../data/mockData';
import { TopicChip } from '../shared/TopicChip';
import { EmptyState } from '../shared/EmptyState';
import { History as HistoryIcon } from '@mui/icons-material';
import type { QuizTopic } from '../../types';

export function HistoryPage() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | QuizTopic>('all');

  const filtered = mockHistory.filter((r) => {
    const matchSearch = r.quizTitle.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || r.category === filterCategory;
    return matchSearch && matchCat;
  });

  const avgScore = Math.round(mockHistory.reduce((a, r) => a + r.percentage, 0) / mockHistory.length);
  const totalQuizzes = mockHistory.length;
  const perfect = mockHistory.filter((r) => r.percentage === 100).length;

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} mb={3}>Game History</Typography>

      {/* Summary Cards */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        {[
          { label: 'Total Quizzes', value: totalQuizzes, icon: '🎮', color: '#5563DE' },
          { label: 'Avg Score', value: `${avgScore}%`, icon: '📊', color: '#22c55e' },
          { label: 'Perfect Scores', value: perfect, icon: '🏆', color: '#f59e0b' },
        ].map(({ label, value, icon, color }) => (
          <Card key={label} sx={{ flex: 1, minWidth: 120 }}>
            <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
              <Typography fontSize={28}>{icon}</Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color }}>{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} mb={2.5} flexWrap="wrap">
        <TextField
          placeholder="Search quizzes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={filterCategory}
            label="Category"
            onChange={(e) => setFilterCategory(e.target.value as any)}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {['General Science', 'Physics', 'Chemistry', 'Mathematics', 'History', 'Geography', 'Electrical', 'Technology'].map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* History List */}
      {filtered.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No history found" description="Try adjusting your filters." />
      ) : (
        <Stack spacing={1.5}>
          {filtered.map((r) => {
            const mins = Math.floor(r.duration / 60);
            const secs = r.duration % 60;
            const scoreColor = r.percentage >= 80 ? 'success.main' : r.percentage >= 60 ? 'warning.main' : 'error.main';
            return (
              <Card key={`${r.quizId}-${r.date}`}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {/* Score Badge */}
                    <Box
                      sx={{
                        width: 54, height: 54, borderRadius: 2, flexShrink: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        bgcolor: scoreColor,
                        color: 'white',
                      }}
                    >
                      <Typography fontWeight={800} lineHeight={1}>{r.percentage}%</Typography>
                      <Typography sx={{ fontSize: '0.6rem', lineHeight: 1 }}>{r.score}/{r.total}</Typography>
                    </Box>

                    {/* Info */}
                    <Box flex={1} minWidth={0}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>{r.quizTitle}</Typography>
                      <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
                        <TopicChip topic={r.category} />
                        <Stack direction="row" spacing={0.25} alignItems="center">
                          <Timer sx={{ fontSize: 12, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {mins}:{secs.toString().padStart(2, '0')}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.25} alignItems="center">
                          <EmojiEvents sx={{ fontSize: 12, color: 'warning.main' }} />
                          <Typography variant="caption" color="text.secondary">#{r.rank}</Typography>
                        </Stack>
                      </Stack>
                    </Box>

                    {/* Date */}
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {r.date}
                    </Typography>
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
