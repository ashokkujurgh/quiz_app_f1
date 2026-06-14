import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Box, Card, CardContent, Typography, Stack, Button, CircularProgress,
  Divider, Avatar, Chip,
} from '@mui/material';
import {
  EmojiEvents, Replay, Home, CheckCircle, Cancel, RemoveCircle,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { resetQuiz } from '../../store/slices/quizSlice';
import type { LeaderboardRow } from '../../hooks/useQuizSocket';

const API = import.meta.env.VITE_API_URL ?? '';

interface HistoryAnswer {
  questionIndex: number;
  questionText:  string;
  options:       string[];
  correctOption: number;
  userAnswer:    number;
  isCorrect:     boolean;
}

interface ResultState {
  leaderboard?:  LeaderboardRow[];
  myEntry?:      LeaderboardRow;
  quizId?:       string;
  quizTitle?:    string;
  userAnswers?:  Record<number, number>; // questionIndex → selectedOption (from live game)
}

const MEDAL = ['🥇', '🥈', '🥉'];

export function QuizResultPage() {
  const navigate  = useNavigate();
  const dispatch  = useAppDispatch();
  const location  = useLocation();
  const { result, activeQuiz } = useAppSelector((s) => s.quiz);
  const { accessToken } = useAppSelector((s) => s.auth);

  const state = (location.state ?? {}) as ResultState;
  const leaderboard = state.leaderboard ?? [];
  const myEntry     = state.myEntry;

  const score  = myEntry?.score      ?? result?.score      ?? 0;
  const total  = myEntry?.total      ?? result?.total      ?? 0;
  const pct    = myEntry?.percentage ?? result?.percentage ?? 0;
  const rank   = myEntry?.rank       ?? result?.rank       ?? null;
  const title  = state.quizTitle     ?? result?.quizTitle  ?? 'Quiz';

  // Fetch per-user answer history from backend for the answer review
  const [historyAnswers, setHistoryAnswers] = useState<HistoryAnswer[] | null>(null);

  useEffect(() => {
    const quizId = state.quizId;
    if (!quizId || !accessToken) return;
    fetch(`${API}/api/quizzes/${quizId}/my-history`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.history?.answers) setHistoryAnswers(d.history.answers);
      })
      .catch(() => {});
  }, [state.quizId, accessToken]);

  if (!result && !myEntry) { navigate('/quizzes'); return null; }

  const grade =
    pct >= 90 ? { label: 'Excellent!',      emoji: '🏆', color: '#f59e0b' } :
    pct >= 75 ? { label: 'Great Job!',       emoji: '🎉', color: '#22c55e' } :
    pct >= 60 ? { label: 'Good Effort!',     emoji: '👍', color: '#3b82f6' } :
                { label: 'Keep Practicing!', emoji: '📚', color: '#ef4444' };

  const timeTaken = myEntry?.timeTaken ?? result?.duration ?? 0;
  const mins      = Math.floor(timeTaken / 60);
  const secs      = timeTaken % 60;

  // Build answer review items — prefer backend history, fall back to live userAnswers
  const reviewItems: HistoryAnswer[] | null = historyAnswers ?? (() => {
    if (!state.userAnswers || !activeQuiz) return null;
    return activeQuiz.questions.map((q, i) => ({
      questionIndex: i,
      questionText:  q.question,
      options:       q.options,
      correctOption: q.correctAnswer,
      userAnswer:    state.userAnswers![i] ?? -1,
      isCorrect:     (state.userAnswers![i] ?? -1) === q.correctAnswer,
    }));
  })();

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      {/* Hero */}
      <Card sx={{ mb: 3, textAlign: 'center' }}>
        <CardContent sx={{ py: 4 }}>
          <Typography fontSize={56} mb={1}>{grade.emoji}</Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: grade.color, mb: 0.5 }}>
            {grade.label}
          </Typography>
          <Typography variant="h6" color="text.secondary" mb={3}>{title}</Typography>

          <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
            <CircularProgress variant="determinate" value={pct} size={120} thickness={6} sx={{ color: grade.color }} />
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h4" fontWeight={800}>{pct}%</Typography>
              <Typography variant="caption" color="text.secondary">Score</Typography>
            </Box>
          </Box>

          <Stack direction="row" justifyContent="center" spacing={4} flexWrap="wrap">
            <Box textAlign="center">
              <Typography variant="h5" fontWeight={800} color="success.main">{score}</Typography>
              <Typography variant="caption" color="text.secondary">Correct</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h5" fontWeight={800} color="error.main">{total - score}</Typography>
              <Typography variant="caption" color="text.secondary">Wrong</Typography>
            </Box>
            {rank && (
              <Box textAlign="center">
                <Typography variant="h5" fontWeight={800} color="warning.main">#{rank}</Typography>
                <Typography variant="caption" color="text.secondary">Rank</Typography>
              </Box>
            )}
            <Box textAlign="center">
              <Typography variant="h5" fontWeight={800}>{mins}:{secs.toString().padStart(2, '0')}</Typography>
              <Typography variant="caption" color="text.secondary">Duration</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <EmojiEvents sx={{ color: 'warning.main' }} />
              <Typography variant="h6" fontWeight={700}>Leaderboard</Typography>
            </Stack>
            <Stack spacing={1}>
              {leaderboard.map((entry, idx) => {
                const isMe = entry.userId === myEntry?.userId;
                return (
                  <Box key={entry.userId} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    p: 1.5, borderRadius: 2,
                    bgcolor: isMe ? 'primary.main' : idx % 2 === 0 ? 'action.hover' : 'transparent',
                    color: isMe ? 'white' : 'text.primary',
                    border: isMe ? '2px solid' : 'none',
                    borderColor: 'primary.main',
                  }}>
                    <Typography variant="body1" fontWeight={800} sx={{ width: 24, textAlign: 'center' }}>
                      {MEDAL[idx] ?? `#${entry.rank}`}
                    </Typography>
                    <Avatar src={entry.userAvatar} sx={{ width: 32, height: 32, fontSize: 13, bgcolor: isMe ? 'white' : 'primary.main', color: isMe ? 'primary.main' : 'white' }}>
                      {entry.userName[0]}
                    </Avatar>
                    <Typography variant="body2" fontWeight={isMe ? 700 : 500} flex={1} noWrap>
                      {entry.userName}{isMe ? ' (You)' : ''}
                    </Typography>
                    <Chip
                      label={`${entry.score}/${entry.total}`}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor: isMe ? 'rgba(255,255,255,0.25)' : 'action.selected',
                        color: isMe ? 'white' : 'text.primary',
                      }}
                    />
                    <Typography variant="caption" sx={{ minWidth: 38, textAlign: 'right', color: isMe ? 'rgba(255,255,255,0.8)' : 'text.secondary' }}>
                      {entry.percentage}%
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Answer Review */}
      {reviewItems && reviewItems.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>Answer Review</Typography>
            <Stack spacing={1.5}>
              {reviewItems.map((item, idx) => {
                const unanswered = item.userAnswer === -1;
                const icon = item.isCorrect
                  ? <CheckCircle sx={{ color: 'success.main', fontSize: 20, mt: 0.25, flexShrink: 0 }} />
                  : unanswered
                  ? <RemoveCircle sx={{ color: 'warning.main', fontSize: 20, mt: 0.25, flexShrink: 0 }} />
                  : <Cancel sx={{ color: 'error.main', fontSize: 20, mt: 0.25, flexShrink: 0 }} />;

                return (
                  <Box key={item.questionIndex}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      {icon}
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={600}>{item.questionText}</Typography>
                        <Typography variant="caption" color={item.isCorrect ? 'success.main' : unanswered ? 'warning.main' : 'error.main'}>
                          Your answer: {unanswered ? 'Not answered' : item.options[item.userAnswer]}
                        </Typography>
                        {!item.isCorrect && (
                          <Typography variant="caption" color="success.main" display="block">
                            Correct: {item.options[item.correctOption]}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                    {idx < reviewItems.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        <Button variant="outlined" startIcon={<Home />}
          onClick={() => { dispatch(resetQuiz()); navigate('/home'); }} sx={{ flex: 1 }}>
          Home
        </Button>
        <Button variant="outlined" startIcon={<Replay />}
          onClick={() => { dispatch(resetQuiz()); navigate('/quizzes'); }} sx={{ flex: 1 }}>
          Play Again
        </Button>
      </Stack>
    </Box>
  );
}
