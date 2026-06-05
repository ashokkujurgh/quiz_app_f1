import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box, Grid, Typography, Tabs, Tab, Stack, Chip, TextField,
  InputAdornment,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { startQuiz } from '../../store/slices/quizSlice';
import { QuizCard } from '../shared/QuizCard';
import { QuizCardSkeleton } from '../shared/LoadingSkeleton';
import { EmptyState } from '../shared/EmptyState';
import { Quiz as QuizIcon } from '@mui/icons-material';
import type { QuizTopic } from '../../types';
import { topicColors } from '../shared/TopicChip';

const categories: { topic: QuizTopic; emoji: string }[] = [
  { topic: 'General Science', emoji: '🔬' },
  { topic: 'Physics', emoji: '⚛️' },
  { topic: 'Chemistry', emoji: '🧪' },
  { topic: 'Mathematics', emoji: '📐' },
  { topic: 'History', emoji: '🏛️' },
  { topic: 'Geography', emoji: '🌍' },
  { topic: 'Electrical', emoji: '⚡' },
  { topic: 'Technology', emoji: '💻' },
];

export function QuizzesPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const quizzes = useAppSelector((s) => s.quiz.quizzes);
  const [activeCategory, setActiveCategory] = useState<QuizTopic | 'All'>('All');
  const [search, setSearch] = useState('');

  const filtered = quizzes.filter((q) => {
    const matchesCat = activeCategory === 'All' || q.category === activeCategory;
    const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handlePlay = (quiz: any) => {
    dispatch(startQuiz(quiz));
    navigate('/quiz/play');
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} mb={3}>Quizzes</Typography>

      {/* Category Grid */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {categories.map(({ topic, emoji }) => {
          const color = topicColors[topic] ?? '#6366f1';
          const isActive = activeCategory === topic;
          return (
            <Grid item xs={6} sm={4} md={3} key={topic}>
              <Box
                onClick={() => setActiveCategory(isActive ? 'All' : topic)}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: isActive ? color : 'transparent',
                  bgcolor: isActive ? `${color}18` : 'background.paper',
                  transition: 'all 0.15s',
                  textAlign: 'center',
                  '&:hover': { bgcolor: `${color}12`, borderColor: color },
                }}
              >
                <Typography fontSize={28}>{emoji}</Typography>
                <Typography variant="caption" fontWeight={700} noWrap display="block" sx={{ color: isActive ? color : 'text.primary' }}>
                  {topic}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search quizzes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
        }}
        sx={{ mb: 3 }}
      />

      {/* Quiz Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={QuizIcon} title="No quizzes found" description="Try a different category or search term." />
      ) : (
        <Grid container spacing={2}>
          {filtered.map((quiz) => (
            <Grid item xs={12} sm={6} key={quiz.id}>
              <QuizCard quiz={quiz} onClick={() => handlePlay(quiz)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
