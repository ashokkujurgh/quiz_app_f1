import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Box, Typography, Stack, Button, Chip, CircularProgress,
  MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { SportsEsports, FiberManualRecord, Quiz as QuizIcon, PlayArrow } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { apiFetch } from '../../utils/apiFetch';

const API = import.meta.env.VITE_API_URL ?? '';

interface ApiQuiz {
  _id: string;
  title: string;
  status: string;
  durationMinutes: number;
  questionCount: number;
}

interface ApiTopic    { _id: string; name: string }
interface ApiSubTopic { _id: string; name: string; topic: string }

// ── Live / Active Games ───────────────────────────────────────────────────────
function LiveGamesSection() {
  const navigate = useNavigate();
  const { accessToken } = useAppSelector((s) => s.auth);
  const [games, setGames]     = useState<ApiQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/quizzes?status=active`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setGames((d.quizzes as ApiQuiz[]).slice(0, 5)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async (quiz: ApiQuiz) => {
    if (!accessToken) { navigate('/login'); return; }
    navigate(`/quiz/play/${quiz._id}`);
  };

  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 2, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
        <SportsEsports sx={{ color: 'success.main', fontSize: 18 }} />
        <Typography variant="subtitle2" fontWeight={700}>Live Games</Typography>
        {games.length > 0 && (
          <Chip
            label={`${games.length} live`}
            size="small"
            color="success"
            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, ml: 'auto !important' }}
          />
        )}
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
          <CircularProgress size={20} />
        </Box>
      ) : games.length === 0 ? (
        <Typography variant="caption" color="text.secondary">No live games right now.</Typography>
      ) : (
        <Stack spacing={1}>
          {games.map((g) => (
            <Stack key={g._id} direction="row" spacing={1} alignItems="center"
              sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}
              onClick={() => handleJoin(g)}
            >
              <FiberManualRecord sx={{ color: 'success.main', fontSize: 10, flexShrink: 0, animation: 'pulse 1.2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
              <Box flex={1} minWidth={0}>
                <Typography variant="caption" fontWeight={700} noWrap display="block">{g.title}</Typography>
                <Typography variant="caption" color="text.secondary">{g.questionCount} questions · {g.durationMinutes}min</Typography>
              </Box>
              <Button size="small" variant="contained" color="success" sx={{ fontSize: '0.6rem', py: 0.25, px: 0.75, minWidth: 0, flexShrink: 0 }}>
                Join
              </Button>
            </Stack>
          ))}
        </Stack>
      )}
      <Button fullWidth size="small" sx={{ mt: 1.5 }} onClick={() => navigate('/quizzes')}>
        All Games
      </Button>
    </Box>
  );
}

// ── Practice Quiz ─────────────────────────────────────────────────────────────
function PracticeQuizSection() {
  const navigate = useNavigate();
  const { accessToken } = useAppSelector((s) => s.auth);

  const [subTopics, setSubTopics]   = useState<ApiSubTopic[]>([]);
  const [subTopicId, setSubTopicId] = useState('');
  const [count, setCount]           = useState(10);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    fetch(`${API}/api/topics`)
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.success || !d.topics?.length) return;
        const active = (d.topics as (ApiTopic & { isActive?: boolean })[]).filter((t) => t.isActive !== false);
        const results = await Promise.all(
          active.map((t) =>
            fetch(`${API}/api/topics/${t._id}/subtopics`)
              .then((r) => r.json())
              .then((sd) => ((sd.subtopics ?? []) as (ApiSubTopic & { isActive?: boolean })[]).filter((s) => s.isActive !== false))
              .catch(() => [] as ApiSubTopic[])
          )
        );
        setSubTopics(results.flat());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStart = () => {
    if (!accessToken) { navigate('/login'); return; }
    if (!subTopicId) return;
    const sub = subTopics.find((s) => s._id === subTopicId);
    navigate('/practice', { state: { subTopicId, subTopicName: sub?.name ?? 'Practice', count } });
  };

  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 2, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
        <QuizIcon sx={{ color: 'primary.main', fontSize: 18 }} />
        <Typography variant="subtitle2" fontWeight={700}>Practice Quiz</Typography>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}><CircularProgress size={20} /></Box>
      ) : (
        <Stack spacing={1.5}>
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ fontSize: '0.8rem' }}>Select Subtopic</InputLabel>
            <Select
              value={subTopicId}
              label="Select Subtopic"
              onChange={(e) => setSubTopicId(e.target.value)}
              sx={{ fontSize: '0.8rem' }}
            >
              <MenuItem value=""><em>Choose a subtopic…</em></MenuItem>
              {subTopics.map((s) => <MenuItem key={s._id} value={s._id} sx={{ fontSize: '0.8rem' }}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel sx={{ fontSize: '0.8rem' }}>No. of Questions</InputLabel>
            <Select
              value={count}
              label="No. of Questions"
              onChange={(e) => setCount(Number(e.target.value))}
              sx={{ fontSize: '0.8rem' }}
            >
              {[5, 10, 15, 20, 25, 30].map((n) => (
                <MenuItem key={n} value={n} sx={{ fontSize: '0.8rem' }}>{n} questions</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained" fullWidth startIcon={<PlayArrow />}
            disabled={!subTopicId}
            onClick={handleStart}
            sx={{ fontWeight: 700, color: 'white !important' }}
          >
            Start Practice
          </Button>
        </Stack>
      )}
    </Box>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export function RightSidebar() {
  return (
    <Box sx={{ width: 280, flexShrink: 0, display: { xs: 'none', lg: 'block' } }}>
      <Box sx={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <LiveGamesSection />
        <PracticeQuizSection />
      </Box>
    </Box>
  );
}
