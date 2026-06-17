import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Box, Card, CardContent, Typography, Stack, Button,
  Divider, Avatar, Chip, Alert, CircularProgress,
} from '@mui/material';
import {
  EmojiEvents, Replay, Home, CheckCircle, Cancel, RemoveCircle,
  Share, CheckCircleOutline,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { resetQuiz } from '../../store/slices/quizSlice';
import { apiFetch } from '../../utils/apiFetch';
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
  const { accessToken, user }  = useAppSelector((s) => s.auth);

  const state = (location.state ?? {}) as ResultState;
  const leaderboard = state.leaderboard ?? [];
  const myEntry     = state.myEntry;

  const score  = myEntry?.score      ?? result?.score      ?? 0;
  const total  = myEntry?.total      ?? result?.total      ?? 0;
  const pct    = myEntry?.percentage ?? result?.percentage ?? 0;
  const rank   = myEntry?.rank       ?? result?.rank       ?? null;
  const title  = state.quizTitle     ?? result?.quizTitle  ?? 'Quiz';

  // Share-to-feed state
  const [sharing, setSharing]     = useState(false);
  const [shared, setShared]       = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const handleShareToFeed = async () => {
    if (!user || sharing || shared) return;
    setSharing(true);
    setShareError(null);
    try {
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      const content = rank
        ? `Just finished "${title}" and ranked ${medal} with ${score}/${total} (${pct}%)! 🎯 Think you can beat me? Join the next quiz! 🚀`
        : `Just completed "${title}" — scored ${score}/${total} (${pct}%)! 🎯 Join the next quiz! 🚀`;

      const body = {
        content,
        topic:          'General',
        authorName:     user.name,
        authorUsername: user.username,
        authorAvatar:   user.avatar ?? null,
        quizResult: {
          quizId:     state.quizId ?? '',
          quizTitle:  title,
          category:   'General',
          score,
          total,
          percentage: pct,
          rank:       rank ?? undefined,
          duration:   0,
        },
      };

      const res = await apiFetch(`${API}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to share');
      setShared(true);
    } catch (err) {
      setShareError((err as Error).message ?? 'Failed to share post');
    } finally {
      setSharing(false);
    }
  };

  // Fetch per-user answer history from backend for the answer review
  const [historyAnswers, setHistoryAnswers] = useState<HistoryAnswer[] | null>(null);

  useEffect(() => {
    const quizId = state.quizId;
    if (!quizId || !accessToken) return;
    apiFetch(`${API}/api/quizzes/${quizId}/my-history`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.history?.answers) setHistoryAnswers(d.history.answers);
      })
      .catch(() => {});
  }, [state.quizId, accessToken]);

  if (!result && !myEntry) { navigate('/quizzes'); return null; }

  // Build answer review — prefer backend history but patch -1 entries with local answers
  const reviewItems: HistoryAnswer[] | null = (() => {
    const local = state.userAnswers ?? {};
    if (historyAnswers) {
      // Merge: if backend says userAnswer=-1 but we have a local answer, use local
      return historyAnswers.map((item) => {
        const localAns = local[item.questionIndex];
        if (item.userAnswer === -1 && localAns !== undefined && localAns !== -1) {
          return {
            ...item,
            userAnswer: localAns,
            isCorrect:  localAns === item.correctOption,
          };
        }
        return item;
      });
    }
    if (!state.userAnswers || !activeQuiz) return null;
    return activeQuiz.questions.map((q, i) => ({
      questionIndex: i,
      questionText:  q.question,
      options:       q.options,
      correctOption: q.correctAnswer,
      userAnswer:    local[i] ?? -1,
      isCorrect:     (local[i] ?? -1) === q.correctAnswer,
    }));
  })();

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
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

      {/* Share feedback */}
      {shared && (
        <Alert severity="success" icon={<CheckCircleOutline />} sx={{ mb: 2, borderRadius: 2 }}>
          Your result has been shared to the feed!
        </Alert>
      )}
      {shareError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setShareError(null)}>
          {shareError}
        </Alert>
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
        {user && !shared && (
          <Button
            variant="contained"
            color="primary"
            startIcon={sharing ? <CircularProgress size={16} color="inherit" /> : <Share />}
            onClick={handleShareToFeed}
            disabled={sharing}
            sx={{ flex: 1 }}
          >
            {sharing ? 'Sharing…' : 'Share to Feed'}
          </Button>
        )}
        {shared && (
          <Button variant="contained" color="success" startIcon={<CheckCircleOutline />}
            disabled sx={{ flex: 1 }}>
            Shared!
          </Button>
        )}
      </Stack>
    </Box>
  );
}
