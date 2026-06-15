import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Chip, TextField,
  InputAdornment, CircularProgress, Alert, Collapse, Divider,
  IconButton,
} from '@mui/material';
import {
  Search, Timer, EmojiEvents, CheckCircle, Cancel,
  RemoveCircle, ExpandMore, ExpandLess, History as HistoryIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { EmptyState } from '../shared/EmptyState';
import { apiFetch } from '../../utils/apiFetch';

const API = import.meta.env.VITE_API_URL ?? '';

interface HistoryAnswer {
  questionIndex: number;
  questionText:  string;
  options:       string[];
  correctOption: number;
  userAnswer:    number;
  isCorrect:     boolean;
}

interface GameHistoryEntry {
  _id:         string;
  quizId:      string;
  quizTitle:   string;
  score:       number;
  total:       number;
  percentage:  number;
  rank:        number;
  timeTaken:   number;
  completedAt: string;
  answers:     HistoryAnswer[];
}

export function HistoryPage() {
  const { accessToken } = useAppSelector((s) => s.auth);

  const [history, setHistory]   = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch(`${API}/api/quizzes/my/history`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.message ?? 'Failed');
        setHistory(d.history ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const filtered = history.filter((h) =>
    h.quizTitle.toLowerCase().includes(search.toLowerCase())
  );

  const totalQuizzes = history.length;
  const avgScore     = totalQuizzes ? Math.round(history.reduce((a, h) => a + h.percentage, 0) / totalQuizzes) : 0;
  const perfect      = history.filter((h) => h.percentage === 100).length;

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} mb={3}>Game History</Typography>

      {/* Summary cards */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        {[
          { label: 'Total Quizzes', value: totalQuizzes, icon: '🎮', color: '#5563DE' },
          { label: 'Avg Score',     value: `${avgScore}%`, icon: '📊', color: '#22c55e' },
          { label: 'Perfect Scores', value: perfect,      icon: '🏆', color: '#f59e0b' },
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

      {/* Search */}
      <TextField
        placeholder="Search quizzes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 2.5 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No history found" description="Play a quiz to see your history here." />
      ) : (
        <Stack spacing={1.5}>
          {filtered.map((h) => {
            const mins       = Math.floor(h.timeTaken / 60);
            const secs       = h.timeTaken % 60;
            const scoreColor = h.percentage >= 80 ? 'success.main' : h.percentage >= 60 ? 'warning.main' : 'error.main';
            const isOpen     = expanded === h._id;
            const date       = new Date(h.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

            return (
              <Card key={h._id}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: isOpen ? 2 : 2 } }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {/* Score badge */}
                    <Box sx={{
                      width: 54, height: 54, borderRadius: 2, flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      bgcolor: scoreColor, color: 'white',
                    }}>
                      <Typography fontWeight={800} lineHeight={1}>{h.percentage}%</Typography>
                      <Typography sx={{ fontSize: '0.6rem', lineHeight: 1 }}>{h.score}/{h.total}</Typography>
                    </Box>

                    {/* Info */}
                    <Box flex={1} minWidth={0}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>{h.quizTitle}</Typography>
                      <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
                        <Chip label={`#${h.rank} Rank`} size="small" icon={<EmojiEvents sx={{ fontSize: '12px !important' }} />} sx={{ height: 20, fontSize: '0.65rem' }} />
                        <Stack direction="row" spacing={0.25} alignItems="center">
                          <Timer sx={{ fontSize: 12, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {mins}:{secs.toString().padStart(2, '0')}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{date}</Typography>
                      </Stack>
                    </Box>

                    {/* Expand toggle */}
                    {h.answers.length > 0 && (
                      <IconButton
                        size="small"
                        onClick={() => setExpanded(isOpen ? null : h._id)}
                        sx={{ flexShrink: 0 }}
                      >
                        {isOpen ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    )}
                  </Stack>

                  {/* Answer review (expanded) */}
                  <Collapse in={isOpen}>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                      Answer Review
                    </Typography>
                    <Stack spacing={1}>
                      {h.answers.map((a, idx) => {
                        const unanswered = a.userAnswer === -1;
                        const icon = a.isCorrect
                          ? <CheckCircle sx={{ color: 'success.main', fontSize: 18, mt: 0.2, flexShrink: 0 }} />
                          : unanswered
                          ? <RemoveCircle sx={{ color: 'warning.main', fontSize: 18, mt: 0.2, flexShrink: 0 }} />
                          : <Cancel sx={{ color: 'error.main', fontSize: 18, mt: 0.2, flexShrink: 0 }} />;

                        return (
                          <Box key={idx}>
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                              {icon}
                              <Box flex={1}>
                                <Typography variant="caption" fontWeight={600} display="block">{a.questionText}</Typography>
                                <Typography variant="caption" color={a.isCorrect ? 'success.main' : unanswered ? 'warning.main' : 'error.main'}>
                                  Your answer: {unanswered ? 'Not answered' : a.options[a.userAnswer]}
                                </Typography>
                                {!a.isCorrect && (
                                  <Typography variant="caption" color="success.main" display="block">
                                    Correct: {a.options[a.correctOption]}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                            {idx < h.answers.length - 1 && <Divider sx={{ mt: 1 }} />}
                          </Box>
                        );
                      })}
                    </Stack>
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
