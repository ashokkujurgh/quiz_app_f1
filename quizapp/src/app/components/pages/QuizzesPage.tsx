import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Box, Grid, Typography, TextField, InputAdornment,
  CircularProgress, Alert, Button, Chip, Stack, Card, CardContent,
  CardMedia, CardActionArea,
} from '@mui/material';
import { Search, Timer, Quiz as QuizIcon, Lock, Public, Group } from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { startQuiz } from '../../store/slices/quizSlice';
import { EmptyState } from '../shared/EmptyState';
import type { Quiz, QuizQuestion, QuizTopic } from '../../types';

const API = import.meta.env.VITE_API_URL ?? '';

// ── API types ─────────────────────────────────────────────────────────────────
interface ApiQuiz {
  _id: string;
  title: string;
  description: string;
  durationMinutes: number;
  questionCount: number;
  status: string;
  participation: 'public' | 'private' | 'invite_only';
  image?: string | null;
  topic?: { name?: string } | string | null;
  difficulty?: string;
}

interface ApiQuestion {
  _id: string;
  text: string;
  options: { text: string }[];
  correctOption: number;
  description?: string;
}

function mapQuiz(q: ApiQuiz): Omit<Quiz, 'questions'> & { _apiId: string } {
  return {
    _apiId: q._id,
    id: q._id,
    title: q.title,
    description: q.description || 'Test your knowledge!',
    category: 'General Science' as QuizTopic,
    duration: (q.durationMinutes ?? 10) * 60,
    difficulty: (q.difficulty as Quiz['difficulty']) ?? 'Medium',
    plays: 0,
    rating: 4.5,
    createdBy: {} as any,
    thumbnail: q.image ?? undefined,
    questionCount: q.questionCount,
    questions: [],
  };
}

function mapQuestion(q: ApiQuestion): QuizQuestion {
  return {
    id: q._id,
    question: q.text,
    options: q.options.map((o) => o.text),
    correctAnswer: q.correctOption,
    explanation: q.description || undefined,
  };
}

const STATUS_TABS = ['all', 'active', 'scheduled'] as const;
type StatusTab = typeof STATUS_TABS[number];

export function QuizzesPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { accessToken } = useAppSelector((s) => s.auth);

  const [quizzes, setQuizzes] = useState<(ReturnType<typeof mapQuiz>)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<StatusTab>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (tab !== 'all') params.set('status', tab);
    fetch(`${API}/api/quizzes?${params}`, {
      credentials: 'include',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.message ?? 'Failed');
        setQuizzes((d.quizzes as ApiQuiz[]).map(mapQuiz));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab, accessToken]);

  const handlePlay = async (q: ReturnType<typeof mapQuiz>) => {
    if (!accessToken) { navigate('/login'); return; }
    setPlayingId(q.id);
    try {
      const res = await fetch(`${API}/api/quizzes/${q.id}/questions`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message ?? 'Failed to load questions');

      const questions: QuizQuestion[] = (data.questions as ApiQuestion[]).map(mapQuestion);
      if (questions.length === 0) throw new Error('This quiz has no questions yet.');

      const fullQuiz: Quiz = { ...q, questions };
      dispatch(startQuiz(fullQuiz));
      navigate('/quiz/play');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPlayingId(null);
    }
  };

  const filtered = quizzes.filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    q.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} mb={0.5}>Quizzes</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Challenge yourself and compete with others
      </Typography>

      {/* Status tabs */}
      <Stack direction="row" spacing={1} mb={2.5}>
        {STATUS_TABS.map((t) => (
          <Chip
            key={t}
            label={t.charAt(0).toUpperCase() + t.slice(1)}
            clickable
            variant={tab === t ? 'filled' : 'outlined'}
            color={tab === t ? 'primary' : 'default'}
            onClick={() => setTab(t)}
            sx={{ fontWeight: tab === t ? 700 : 500, textTransform: 'capitalize' }}
          />
        ))}
      </Stack>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search quizzes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        sx={{ mb: 3 }}
        size="small"
      />

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <EmptyState icon={QuizIcon} title="No quizzes found" description="Try a different filter or search term." />
      ) : (
        <Grid container spacing={2}>
          {filtered.map((q) => (
            <Grid item xs={12} sm={6} md={6} key={q.id}>
              <QuizCard
                quiz={q}
                loading={playingId === q.id}
                onPlay={() => handlePlay(q)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

// ── Quiz Card ─────────────────────────────────────────────────────────────────
function QuizCard({
  quiz,
  loading,
  onPlay,
}: {
  quiz: ReturnType<typeof mapQuiz>;
  loading: boolean;
  onPlay: () => void;
}) {
  const mins = Math.floor(quiz.duration / 60);

  const diffColor =
    quiz.difficulty === 'Easy' ? 'success' :
    quiz.difficulty === 'Hard' ? 'error' : 'warning';

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
      {quiz.thumbnail ? (
        <CardMedia component="img" height="140" image={quiz.thumbnail} alt={quiz.title} sx={{ objectFit: 'cover' }} />
      ) : (
        <Box sx={{
          height: 100,
          background: 'linear-gradient(135deg, #5563DE 0%, #a855f7 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <QuizIcon sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
        </Box>
      )}

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" spacing={1} mb={1} flexWrap="wrap">
          <Chip label={quiz.difficulty} color={diffColor as any} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
        </Stack>

        <Typography variant="subtitle1" fontWeight={700} mb={0.5} sx={{
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {quiz.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 2, flex: 1,
        }}>
          {quiz.description}
        </Typography>

        <Stack direction="row" spacing={2} mb={2}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Timer sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">{mins} min</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <QuizIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">{quiz.questionCount ?? '?'} questions</Typography>
          </Stack>
        </Stack>

        <Button
          variant="contained"
          fullWidth
          onClick={onPlay}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {loading ? 'Loading…' : 'Play Now'}
        </Button>
      </CardContent>
    </Card>
  );
}
