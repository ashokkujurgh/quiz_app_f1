import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Box, Typography, Stack, Button, CircularProgress,
  Alert, Chip, LinearProgress, Divider,
} from '@mui/material';
import {
  CheckCircle, Cancel, ArrowBack, ArrowForward,
  EmojiEvents, Home, Replay, RemoveCircle,
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';

const API = import.meta.env.VITE_API_URL ?? '';

interface ApiQuestion {
  _id: string;
  text: string;
  options: { text: string }[];
  correctOption: number;
  description?: string;
}

interface PracticeState {
  subTopicId:   string | null;
  subTopicName: string;
  count:        number;
  questions?:   ApiQuestion[]; // pre-loaded (from "Play as Test")
}

const OPTION_COLORS = ['#6366f1', '#a855f7', '#06b6d4', '#10b981'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function PracticeQuizPage() {
  const navigate        = useNavigate();
  const location        = useLocation();
  const { accessToken } = useAppSelector((s) => s.auth);
  const state           = (location.state ?? {}) as PracticeState;

  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Pre-loaded questions (Play as Test from past quiz)
    if (state.questions && state.questions.length > 0) {
      setQuestions(state.questions.sort(() => Math.random() - 0.5));
      setLoading(false);
      return;
    }
    if (!state.subTopicId) { navigate('/home'); return; }
    const want   = state.count ?? 10;
    const params = new URLSearchParams({ subTopic: state.subTopicId, limit: '100' });
    fetch(`${API}/api/questions?${params}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.message ?? 'Failed to load questions');
        const shuffled = (d.questions as ApiQuestion[]).sort(() => Math.random() - 0.5).slice(0, want);
        if (shuffled.length === 0) throw new Error('No questions available for this subtopic.');
        setQuestions(shuffled);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0d1117 100%)' }}>
      <CircularProgress size={52} sx={{ color: '#a855f7' }} />
      <Typography color="rgba(255,255,255,0.7)" variant="h6">Loading questions…</Typography>
      <Typography color="rgba(255,255,255,0.4)" variant="body2">{state.subTopicName}</Typography>
    </Box>
  );

  if (error) return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Alert severity="error" action={<Button onClick={() => navigate('/home')}>Go Back</Button>} sx={{ maxWidth: 500 }}>{error}</Alert>
    </Box>
  );

  // ── Results ───────────────────────────────────────────────────────────────
  if (submitted) {
    const correct = questions.filter((q, i) => selected[i] === q.correctOption).length;
    const pct     = Math.round((correct / questions.length) * 100);
    const grade   =
      pct >= 90 ? { label: 'Excellent!',  emoji: '🏆', color: '#f59e0b', glow: '#f59e0b40' } :
      pct >= 75 ? { label: 'Great Job!',  emoji: '🎉', color: '#22c55e', glow: '#22c55e40' } :
      pct >= 60 ? { label: 'Good Effort!',emoji: '👍', color: '#3b82f6', glow: '#3b82f640' } :
                  { label: 'Nice Try!',   emoji: '💪', color: '#a855f7', glow: '#a855f740' };

    return (
      <Box sx={{ minHeight: 'calc(100vh - 64px)', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0d1117 100%)', py: 4, px: 2 }}>
        <Box sx={{ maxWidth: 700, mx: 'auto' }}>

          {/* Score Hero */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography fontSize={64} lineHeight={1} mb={1}>{grade.emoji}</Typography>
            <Typography variant="h3" fontWeight={900} sx={{ color: grade.color, mb: 0.5, textShadow: `0 0 30px ${grade.glow}` }}>
              {grade.label}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', mb: 3 }}>{state.subTopicName} Practice</Typography>

            {/* Circular score */}
            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
              <CircularProgress variant="determinate" value={pct} size={130} thickness={5}
                sx={{ color: grade.color, filter: `drop-shadow(0 0 12px ${grade.glow})` }} />
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h3" fontWeight={900} sx={{ color: 'white' }}>{pct}%</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Score</Typography>
              </Box>
            </Box>

            {/* Stats row */}
            <Stack direction="row" justifyContent="center" spacing={3}>
              {[
                { label: 'Correct',   value: correct,                    color: '#22c55e' },
                { label: 'Wrong',     value: questions.length - correct,  color: '#ef4444' },
                { label: 'Total',     value: questions.length,            color: '#a855f7' },
              ].map(({ label, value, color }) => (
                <Box key={label} sx={{ textAlign: 'center', px: 2, py: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="h5" fontWeight={800} sx={{ color }}>{value}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>{label}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Answer Review */}
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: 'white', mb: 2 }}>Answer Review</Typography>
            <Stack spacing={2}>
              {questions.map((q, i) => {
                const userAns   = selected[i] ?? -1;
                const isCorrect = userAns === q.correctOption;
                const noAns     = userAns === -1;
                return (
                  <Box key={q._id}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box sx={{ mt: 0.25, flexShrink: 0 }}>
                        {isCorrect
                          ? <CheckCircle sx={{ color: '#22c55e', fontSize: 20 }} />
                          : noAns
                          ? <RemoveCircle sx={{ color: '#f59e0b', fontSize: 20 }} />
                          : <Cancel sx={{ color: '#ef4444', fontSize: 20 }} />}
                      </Box>
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={600} sx={{ color: 'rgba(255,255,255,0.9)', mb: 0.5 }}>
                          {i + 1}. {q.text}
                        </Typography>
                        <Typography variant="caption" sx={{ color: isCorrect ? '#22c55e' : noAns ? '#f59e0b' : '#ef4444' }}>
                          Your answer: {noAns ? 'Not answered' : q.options[userAns]?.text}
                        </Typography>
                        {!isCorrect && !noAns && (
                          <Typography variant="caption" sx={{ color: '#22c55e', display: 'block' }}>
                            Correct: {q.options[q.correctOption]?.text}
                          </Typography>
                        )}
                        {q.description && (
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mt: 0.25, fontStyle: 'italic' }}>
                            {q.description}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                    {i < questions.length - 1 && <Divider sx={{ mt: 2, borderColor: 'rgba(255,255,255,0.06)' }} />}
                  </Box>
                );
              })}
            </Stack>
          </Box>

          {/* Actions */}
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" startIcon={<Home />} onClick={() => navigate('/home')}
              sx={{ flex: 1, color: 'white', borderColor: 'rgba(255,255,255,0.2)', '&:hover': { borderColor: 'white' } }}>
              Home
            </Button>
            <Button variant="contained" startIcon={<Replay />}
              onClick={() => navigate('/home', { state: { openPractice: true } })}
              sx={{ flex: 1, bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, fontWeight: 700 }}>
              Practice Again
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  const q        = questions[current];
  const total    = questions.length;
  const answered = Object.keys(selected).length;
  const pctDone  = (current / total) * 100;

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0d1117 100%)', py: 3, px: 2 }}>
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>

        {/* Top bar */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/home')}
            sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' } }} size="small">
            Exit
          </Button>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={state.subTopicName} size="small"
              sx={{ bgcolor: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)', fontWeight: 600 }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
              {current + 1} / {total}
            </Typography>
          </Stack>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
            {answered}/{total} answered
          </Typography>
        </Stack>

        {/* Progress bar */}
        <LinearProgress variant="determinate" value={pctDone}
          sx={{ mb: 3, height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #6366f1, #a855f7)' } }} />

        {/* Question card */}
        <Box sx={{
          bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)', p: { xs: 2.5, sm: 3.5 }, mb: 2.5,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <Typography variant="caption" sx={{ color: '#a855f7', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
            Question {current + 1}
          </Typography>
          <Typography variant="h6" fontWeight={700} sx={{ color: 'white', mb: 3, lineHeight: 1.5 }}>
            {q.text}
          </Typography>

          {/* Options */}
          <Stack spacing={1.5}>
            {q.options.map((opt, i) => {
              const isSelected = selected[current] === i;
              const color      = OPTION_COLORS[i % OPTION_COLORS.length];
              return (
                <Box
                  key={i}
                  onClick={() => setSelected((p) => ({ ...p, [current]: i }))}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 2,
                    p: 1.75, borderRadius: 2.5, cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: isSelected ? color : 'rgba(255,255,255,0.08)',
                    bgcolor: isSelected ? `${color}18` : 'rgba(255,255,255,0.03)',
                    boxShadow: isSelected ? `0 0 16px ${color}40` : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: color,
                      bgcolor: `${color}10`,
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: isSelected ? color : 'rgba(255,255,255,0.08)',
                    color: isSelected ? 'white' : 'rgba(255,255,255,0.4)',
                    fontWeight: 800, fontSize: '0.8rem',
                    transition: 'all 0.2s',
                  }}>
                    {OPTION_LABELS[i]}
                  </Box>
                  <Typography sx={{ color: isSelected ? 'white' : 'rgba(255,255,255,0.75)', fontWeight: isSelected ? 600 : 400, fontSize: '0.95rem' }}>
                    {opt.text}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {/* Navigation */}
        <Stack direction="row" spacing={1.5} mb={2.5}>
          <Button
            variant="outlined" startIcon={<ArrowBack />}
            disabled={current === 0}
            onClick={() => setCurrent((c) => c - 1)}
            sx={{ flex: 1, color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.15)', '&:hover': { borderColor: 'white', color: 'white' }, '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' } }}
          >
            Previous
          </Button>
          {current < total - 1 ? (
            <Button
              variant="contained" endIcon={<ArrowForward />}
              onClick={() => setCurrent((c) => c + 1)}
              sx={{ flex: 1, background: 'linear-gradient(135deg, #6366f1, #a855f7)', fontWeight: 700, boxShadow: '0 4px 16px rgba(99,102,241,0.4)', '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #9333ea)' } }}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => setSubmitted(true)}
              sx={{ flex: 1, background: 'linear-gradient(135deg, #22c55e, #16a34a)', fontWeight: 700, boxShadow: '0 4px 16px rgba(34,197,94,0.4)', '&:hover': { background: 'linear-gradient(135deg, #16a34a, #15803d)' } }}
              startIcon={<EmojiEvents />}
            >
              Submit ({answered}/{total})
            </Button>
          )}
        </Stack>

        {/* Question dot grid */}
        <Stack direction="row" flexWrap="wrap" gap={0.75} justifyContent="center">
          {questions.map((_, i) => (
            <Box
              key={i}
              onClick={() => setCurrent(i)}
              sx={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700,
                bgcolor: i === current
                  ? 'rgba(99,102,241,1)'
                  : selected[i] !== undefined
                  ? 'rgba(34,197,94,0.7)'
                  : 'rgba(255,255,255,0.08)',
                color: i === current || selected[i] !== undefined ? 'white' : 'rgba(255,255,255,0.4)',
                border: i === current ? '2px solid #a5b4fc' : '2px solid transparent',
                boxShadow: i === current ? '0 0 10px rgba(99,102,241,0.6)' : 'none',
                transition: 'all 0.15s',
                '&:hover': { transform: 'scale(1.15)' },
              }}
            >
              {i + 1}
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
