import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Box, Typography, Stack, Button, IconButton, Avatar, Badge,
  CircularProgress, useTheme, useMediaQuery, Alert, LinearProgress,
} from '@mui/material';
import {
  ArrowBack, Check, EmojiEvents, ArrowForward, Send,
  AccessTime, Star, BlockOutlined,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { completeQuiz, resetQuiz } from '../../store/slices/quizSlice';
import { Navbar } from '../layout/Navbar';
import {
  useQuizSocket,
  type QuestionEvent,
  type QuestionEndedEvent,
  type GameOverEvent,
  type GameStartedEvent,
  type TotalTimerQuestion,
  type LeaderboardRow,
  type PlayerInfo,
} from '../../hooks/useQuizSocket';
import { startQuiz } from '../../store/slices/quizSlice';

const API = import.meta.env.VITE_API_URL ?? '';

interface ApiQuestion {
  _id: string; text: string;
  options: { text: string }[];
  correctOption: number; description?: string
}

function mapApiQuestion(q: ApiQuestion) {
  return { id: q._id, question: q.text, options: q.options.map((o) => o.text), correctAnswer: q.correctOption, explanation: q.description };
}

interface LivePlayer extends PlayerInfo { score: number; answered: number }

// ── Circular countdown SVG ────────────────────────────────────────────────────
function CircleTimer({ value, max, isLow, label }: { value: number; max: number; isLow: boolean; label: string }) {
  const r = 36; const circ = 2 * Math.PI * r;
  const pct = max > 0 ? value / max : 0;
  const offset = circ * (1 - pct);
  const color = isLow ? '#ef4444' : '#6366f1';
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  const display = max >= 60 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${value}`;

  return (
    <Box sx={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
      <svg width={88} height={88} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={44} cy={44} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={6} />
        <circle cx={44} cy={44} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear', filter: isLow ? `drop-shadow(0 0 6px ${color})` : undefined }}
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontWeight: 800, fontSize: isLow ? '1.15rem' : '1rem', color: isLow ? '#ef4444' : 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {display}
        </Typography>
        <Typography sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

// ── Players sidebar ───────────────────────────────────────────────────────────
function PlayersPanel({ players, totalQ, myScore, currentQ }: { players: LivePlayer[]; totalQ: number; myScore: number; currentQ: number }) {
  return (
    <Box sx={{
      width: 240, flexShrink: 0,
      borderRight: '1px solid rgba(255,255,255,0.08)',
      p: 2, position: 'sticky', top: 64, height: 'calc(100vh - 64px)',
      overflowY: 'auto', bgcolor: 'rgba(255,255,255,0.02)',
    }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2.5}>
        <EmojiEvents sx={{ color: '#f59e0b', fontSize: 18 }} />
        <Typography variant="caption" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
          Live Players
        </Typography>
        <Box sx={{ ml: 'auto', bgcolor: 'primary.main', color: 'white', borderRadius: 4, px: 0.75, py: 0.1 }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700 }}>{players.length}</Typography>
        </Box>
      </Stack>

      <Stack spacing={1.5}>
        {players.map((p, i) => {
          const medal = ['🥇', '🥈', '🥉'][i];
          return (
            <Box key={p.userId} sx={{
              p: 1.25, borderRadius: 2,
              bgcolor: i === 0 ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
              border: '1px solid', borderColor: i === 0 ? 'rgba(245,158,11,0.3)' : 'transparent',
              transition: 'all 0.2s',
            }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.75}>
                <Typography sx={{ fontSize: '0.75rem', width: 18, flexShrink: 0 }}>{medal ?? `#${i + 1}`}</Typography>
                <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot"
                  sx={{ '& .MuiBadge-badge': { bgcolor: '#22c55e', boxShadow: '0 0 0 2px #1a1a2e', width: 8, height: 8, borderRadius: '50%', minWidth: 'unset' } }}>
                  <Avatar src={p.userAvatar} sx={{ width: 30, height: 30, fontSize: 12, bgcolor: `hsl(${(p.userName.charCodeAt(0) * 37) % 360},60%,50%)` }}>
                    {p.userName[0]}
                  </Avatar>
                </Badge>
                <Box flex={1} minWidth={0}>
                  <Typography variant="caption" fontWeight={700} noWrap display="block" sx={{ fontSize: '0.72rem' }}>
                    {p.userName}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Star sx={{ fontSize: 10, color: '#f59e0b' }} />
                    <Typography sx={{ fontSize: '0.62rem', color: '#f59e0b', fontWeight: 700 }}>
                      {p.score} pts
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={totalQ > 0 ? (p.answered / totalQ) * 100 : 0}
                sx={{
                  height: 3, borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': { bgcolor: i === 0 ? '#f59e0b' : 'primary.main', borderRadius: 2 },
                }}
              />
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

// ── Mobile player strip ───────────────────────────────────────────────────────
function PlayerStrip({ players }: { players: LivePlayer[] }) {
  return (
    <Box sx={{ overflowX: 'auto', pb: 0.5, mb: 2 }}>
      <Stack direction="row" spacing={1.5} sx={{ minWidth: 'max-content' }}>
        {players.map((p, i) => (
          <Stack key={p.userId} alignItems="center" spacing={0.5}>
            <Box sx={{ position: 'relative' }}>
              <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot"
                sx={{ '& .MuiBadge-badge': { bgcolor: '#22c55e', boxShadow: '0 0 0 2px #1a1a2e', width: 8, height: 8, borderRadius: '50%', minWidth: 'unset' } }}>
                <Avatar src={p.userAvatar} sx={{ width: 38, height: 38, fontSize: 14, bgcolor: `hsl(${(p.userName.charCodeAt(0) * 37) % 360},60%,50%)`, border: i === 0 ? '2px solid #f59e0b' : 'none' }}>
                  {p.userName[0]}
                </Avatar>
              </Badge>
              {i < 3 && (
                <Typography sx={{ position: 'absolute', top: -8, right: -6, fontSize: '0.65rem' }}>
                  {['🥇', '🥈', '🥉'][i]}
                </Typography>
              )}
            </Box>
            <Typography variant="caption" fontWeight={700} noWrap sx={{ maxWidth: 52, fontSize: '0.6rem', color: 'rgba(255,255,255,0.8)' }}>
              {p.userName.split(' ')[0]}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// ── Option button ─────────────────────────────────────────────────────────────
const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'];

function OptionButton({
  idx, text, selected, ended, correctAnswer, onClick,
}: {
  idx: number; text: string; selected: number;
  ended: QuestionEndedEvent | null; correctAnswer?: number;
  onClick: () => void;
}) {
  const isSelected = selected === idx;
  const isCorrect  = ended && idx === ended.correctAnswer;
  const isWrong    = ended && isSelected && idx !== ended.correctAnswer;
  const locked     = ended !== null || selected !== -1;

  let bg = 'rgba(255,255,255,0.06)';
  let border = 'rgba(255,255,255,0.1)';
  let textColor = 'rgba(255,255,255,0.9)';
  let labelBg = OPTION_COLORS[idx % 4];
  let shadow = 'none';

  if (isCorrect) {
    bg = 'rgba(34,197,94,0.2)'; border = '#22c55e'; textColor = '#86efac'; labelBg = '#22c55e';
    shadow = '0 0 20px rgba(34,197,94,0.3)';
  } else if (isWrong) {
    bg = 'rgba(239,68,68,0.2)'; border = '#ef4444'; textColor = '#fca5a5'; labelBg = '#ef4444';
    shadow = '0 0 20px rgba(239,68,68,0.3)';
  } else if (isSelected) {
    bg = `${OPTION_COLORS[idx % 4]}33`; border = OPTION_COLORS[idx % 4]; labelBg = OPTION_COLORS[idx % 4];
    shadow = `0 0 20px ${OPTION_COLORS[idx % 4]}40`;
  }

  return (
    <Box
      onClick={() => !locked && onClick()}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        p: '14px 18px', borderRadius: 3, border: '1.5px solid',
        borderColor: border, bgcolor: bg, color: textColor,
        cursor: locked ? 'default' : 'pointer',
        boxShadow: shadow,
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        transform: isSelected || isCorrect ? 'scale(1.01)' : 'scale(1)',
        '&:hover': locked ? {} : {
          bgcolor: `${OPTION_COLORS[idx % 4]}22`,
          borderColor: OPTION_COLORS[idx % 4],
          transform: 'scale(1.01)',
        },
      }}
    >
      <Box sx={{
        width: 32, height: 32, borderRadius: 1.5, bgcolor: labelBg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s',
      }}>
        {isCorrect || isWrong
          ? <Check sx={{ fontSize: 16, color: 'white' }} />
          : <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: 'white' }}>{OPTION_LABELS[idx]}</Typography>
        }
      </Box>
      <Typography sx={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.95rem', flex: 1, lineHeight: 1.4 }}>
        {text}
      </Typography>
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function QuizPlayPage() {
  const navigate  = useNavigate();
  const dispatch  = useAppDispatch();
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('md'));
  const { quizId: urlQuizId } = useParams<{ quizId: string }>();

  const { activeQuiz } = useAppSelector((s) => s.quiz);
  const { user, accessToken } = useAppSelector((s) => s.auth);

  // ── Restore on refresh ────────────────────────────────────────────────────
  const [restoring, setRestoring] = useState(!activeQuiz && !!urlQuizId);

  useEffect(() => {
    if (activeQuiz || !urlQuizId || !accessToken) { setRestoring(false); return; }
    const restore = async () => {
      try {
        const [quizRes, qRes] = await Promise.all([
          fetch(`${API}/api/quizzes/${urlQuizId}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch(`${API}/api/quizzes/${urlQuizId}/questions`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        ]);
        const [quizData, qData] = await Promise.all([quizRes.json(), qRes.json()]);
        if (!quizData.success || !qData.success) { navigate('/quizzes'); return; }
        const q = quizData.quiz;
        dispatch(startQuiz({
          id: q._id, title: q.title, description: q.description || '',
          category: 'General Science' as any,
          duration: (q.durationMinutes ?? 30) * 60,
          difficulty: q.difficulty ?? 'Medium',
          plays: 0, rating: 4.5, createdBy: {} as any,
          thumbnail: q.image ?? undefined, questionCount: q.questionCount,
          questions: (qData.questions as ApiQuestion[]).map(mapApiQuestion),
        }));
      } catch { navigate('/quizzes'); }
      finally   { setRestoring(false); }
    };
    restore();
  }, [urlQuizId, accessToken]);

  // ── Game mode state ───────────────────────────────────────────────────────
  const [gameMode, setGameMode]   = useState<'per_question' | 'total_timer' | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver]   = useState(false);
  const [error, setError]         = useState('');
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);

  // ── Per-question state ────────────────────────────────────────────────────
  const [currentQuestion, setCurrentQuestion] = useState<QuestionEvent | null>(null);
  const [questionEnded, setQuestionEnded]     = useState<QuestionEndedEvent | null>(null);
  const [selectedAnswer, setSelectedAnswer]   = useState(-1);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [totalQuestions, setTotalQuestions]   = useState(activeQuiz?.questions.length ?? 0);
  const [myScore, setMyScore]                 = useState(0);
  const [answeredCount, setAnsweredCount]     = useState(0);
  const perQAnswers = useRef<Record<number, number>>({});

  // ── Total timer state ─────────────────────────────────────────────────────
  const [ttQuestions, setTtQuestions]   = useState<TotalTimerQuestion[]>([]);
  const [ttCurrentIdx, setTtCurrentIdx] = useState(0);
  const [ttTimeLeft, setTtTimeLeft]     = useState(0);
  const [ttAnswers, setTtAnswers]       = useState<Record<number, number>>({});
  const [ttSubmitted, setTtSubmitted]   = useState(false);
  const ttSubmittedRef = useRef(false);
  const ttAnswersRef   = useRef<Record<number, number>>({});

  // ── Players ───────────────────────────────────────────────────────────────
  const [players, setPlayers] = useState<LivePlayer[]>(() =>
    user ? [{ userId: user.id, userName: user.name, userAvatar: user.avatar, score: 0, answered: 0 }] : []
  );
  const upsertPlayer = useCallback((info: PlayerInfo) => {
    setPlayers((prev) => prev.some((p) => p.userId === info.userId) ? prev : [...prev, { ...info, score: 0, answered: 0 }]);
  }, []);

  // ── Timers ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameMode !== 'per_question' || !currentQuestion || questionEnded) return;
    setQuestionTimeLeft(currentQuestion.timeLimit);
    const id = setInterval(() => setQuestionTimeLeft((t) => { if (t <= 1) { clearInterval(id); return 0; } return t - 1; }), 1000);
    return () => clearInterval(id);
  }, [gameMode, currentQuestion?.questionIndex, currentQuestion?.timeLimit]);

  useEffect(() => {
    if (gameMode !== 'total_timer' || ttTimeLeft <= 0 || ttSubmitted) return;
    const id = setInterval(() => setTtTimeLeft((t) => {
      if (t <= 1) { clearInterval(id); if (!ttSubmittedRef.current) { ttSubmittedRef.current = true; setTtSubmitted(true); } return 0; }
      return t - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [gameMode, ttTimeLeft > 0, ttSubmitted]);

  // ── Socket handlers ───────────────────────────────────────────────────────
  const handleGameStarted = useCallback((e: GameStartedEvent) => {
    setGameStarted(true); setGameOver(false); setGameMode(e.mode);
    setMyScore(0); setAnsweredCount(0);
    if (e.mode === 'total_timer') {
      setTtQuestions(e.questions ?? []);
      setTtCurrentIdx(0);
      setTtTimeLeft(e.remainingSeconds ?? e.durationSeconds ?? 0);
      setTtAnswers({}); setTtSubmitted(false);
      ttSubmittedRef.current = false; ttAnswersRef.current = {};
      setTotalQuestions(e.questions?.length ?? 0);
    } else {
      setTotalQuestions(e.totalQuestions ?? 0);
    }
  }, []);

  const handleQuestion = useCallback((e: QuestionEvent) => {
    setCurrentQuestion(e); setQuestionEnded(null); setSelectedAnswer(-1);
    setTotalQuestions(e.total); setGameStarted(true);
  }, []);

  const handleQuestionEnded = useCallback((e: QuestionEndedEvent) => {
    setQuestionEnded(e); setAnsweredCount((c) => c + 1);
    setSelectedAnswer((prev) => {
      if (prev !== -1 && prev === e.correctAnswer) {
        setMyScore((s) => s + 1);
        if (user) setPlayers((pl) => pl.map((p) => p.userId === user.id ? { ...p, score: p.score + 1, answered: p.answered + 1 } : p));
      } else if (user) {
        setPlayers((pl) => pl.map((p) => p.userId === user.id ? { ...p, answered: p.answered + 1 } : p));
      }
      return prev;
    });
  }, [user?.id]);

  const handleGameOver = useCallback((e: GameOverEvent) => {
    setGameOver(true);
    setPlayers(e.leaderboard.map((r: LeaderboardRow) => ({ userId: r.userId, userName: r.userName, userAvatar: r.userAvatar, score: r.score, answered: r.total })));
    const myEntry = e.leaderboard.find((r) => r.userId === user?.id);
    const quizSnapshot = activeQuiz;
    if (activeQuiz) dispatch(completeQuiz());
    const answerSnapshot = { ...perQAnswers.current, ...ttAnswersRef.current };
    setTimeout(() => {
      navigate('/quiz/result', { state: { leaderboard: e.leaderboard, myEntry, quizId: quizSnapshot?.id, quizTitle: quizSnapshot?.title, userAnswers: answerSnapshot } });
    }, 2500);
  }, [user?.id, activeQuiz, dispatch, navigate]);

  const { submitAnswer } = useQuizSocket(
    urlQuizId ?? activeQuiz?.id, accessToken,
    user?.name ?? user?.email ?? '', user?.avatar,
    {
      onGameStarted:   handleGameStarted,
      onQuestion:      handleQuestion,
      onQuestionEnded: handleQuestionEnded,
      onGameOver:      handleGameOver,
      onGameError:     ({ message }) => setError(message),
      onPlayerJoined:  upsertPlayer,
      onPlayerLeft:    ({ userId }) => setPlayers((prev) => prev.filter((p) => p.userId !== userId)),
      onPlayersList:   ({ players: list }) => setPlayers(list.map((p) => ({ ...p, score: 0, answered: 0 }))),
      onLeaderboardUpdate: ({ scores }) => {
        setPlayers((prev) => {
          const scoreMap = new Map(scores.map((s) => [s.userId, s]));
          return prev.map((p) => {
            const live = scoreMap.get(p.userId);
            return live ? { ...p, score: live.score, answered: live.answered } : p;
          }).sort((a, b) => b.score - a.score);
        });
        // Also update our own score from the authoritative server data
        const myLive = scores.find((s) => s.userId === user?.id);
        if (myLive) setMyScore(myLive.score);
      },
      onAlreadyAttempted: () => {
        setAlreadyAttempted(true);
      },
    },
  );

  const submitRef = useRef(submitAnswer);
  submitRef.current = submitAnswer;

  useEffect(() => {
    if (!ttSubmitted || gameMode !== 'total_timer') return;
    Object.entries(ttAnswersRef.current).forEach(([idxStr, answer]) => {
      const q = ttQuestions[Number(idxStr)];
      if (q) submitRef.current(q.questionId, Number(idxStr), answer);
    });
  }, [ttSubmitted, gameMode]);

  useEffect(() => { if (!restoring && !activeQuiz && !gameOver) navigate('/quizzes'); }, [restoring, activeQuiz, gameOver]);

  if (restoring) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#0f0f1a' }}>
        <CircularProgress sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  if (alreadyAttempted) {
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', bgcolor: '#0f0f1a', p: 3,
      }}>
        <Box sx={{
          textAlign: 'center', maxWidth: 420,
          bgcolor: '#1a1a2e', borderRadius: 4, p: 5,
          border: '1px solid rgba(239,68,68,0.3)',
          boxShadow: '0 0 40px rgba(239,68,68,0.1)',
        }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 3,
            bgcolor: 'rgba(239,68,68,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BlockOutlined sx={{ fontSize: 44, color: 'error.main' }} />
          </Box>
          <Typography variant="h5" fontWeight={800} color="error.main" mb={1}>
            Already Attempted
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            You have already attempted this quiz. Once you leave an active game you cannot re-enter.
          </Typography>
          <Stack spacing={1.5}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => { dispatch(resetQuiz()); navigate('/quizzes'); }}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Browse Other Quizzes
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => { dispatch(resetQuiz()); navigate('/home'); }}
              sx={{ borderRadius: 2 }}
            >
              Go Home
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  if (!activeQuiz) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectAnswer = (idx: number) => {
    if (questionEnded || selectedAnswer !== -1) return;
    setSelectedAnswer(idx);
    if (currentQuestion) {
      perQAnswers.current[currentQuestion.questionIndex] = idx;
      submitAnswer(currentQuestion.questionId, currentQuestion.questionIndex, idx);
    }
  };

  const handleTtSelect = (idx: number) => {
    if (ttSubmitted) return;
    ttAnswersRef.current = { ...ttAnswersRef.current, [ttCurrentIdx]: idx };
    setTtAnswers((prev) => ({ ...prev, [ttCurrentIdx]: idx }));
  };

  const handleTtSubmit = () => {
    if (ttSubmitted) return;
    ttSubmittedRef.current = true; setTtSubmitted(true);
  };

  const ttQ        = ttQuestions[ttCurrentIdx];
  const ttSelected = ttAnswers[ttCurrentIdx] ?? -1;

  // Timer display
  const pqTimerLow = questionTimeLeft > 0 && questionTimeLeft <= 10;
  const ttTimerLow = ttTimeLeft > 0 && ttTimeLeft <= 30;

  // Progress
  const progressPct = currentQuestion
    ? ((currentQuestion.questionIndex + 1) / totalQuestions) * 100
    : gameMode === 'total_timer' && ttQuestions.length > 0
    ? ((ttCurrentIdx + 1) / ttQuestions.length) * 100
    : 0;

  const questionLabel = currentQuestion
    ? `${currentQuestion.questionIndex + 1} / ${totalQuestions}`
    : gameMode === 'total_timer' && ttQuestions.length > 0
    ? `${ttCurrentIdx + 1} / ${ttQuestions.length}`
    : '';

  // ── Background gradient (changes with question index) ─────────────────────
  const gradients = [
    'linear-gradient(135deg, #0f0f1a 0%, #1a1040 100%)',
    'linear-gradient(135deg, #0f0f1a 0%, #0d2040 100%)',
    'linear-gradient(135deg, #0f0f1a 0%, #1a2010 100%)',
    'linear-gradient(135deg, #0f0f1a 0%, #201015 100%)',
  ];
  const bgIdx = (currentQuestion?.questionIndex ?? ttCurrentIdx) % gradients.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: gradients[bgIdx], transition: 'background 0.8s ease', color: 'white' }}>
      <Navbar onMenuToggle={() => {}} />

      <Box sx={{ display: 'flex', flex: 1, pt: '64px' }}>

        {/* Desktop players panel */}
        {!isMobile && <PlayersPanel players={players} totalQ={totalQuestions} myScore={myScore} currentQ={currentQuestion?.questionIndex ?? 0} />}

        {/* Main content */}
        <Box sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 }, maxWidth: 760, mx: 'auto', width: '100%' }}>

          {/* Mobile players */}
          {isMobile && players.length > 0 && <PlayerStrip players={players} />}

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          {/* Header row */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton size="small" onClick={() => { dispatch(resetQuiz()); navigate('/quizzes', { replace: true }); }}
                sx={{ color: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}>
                <ArrowBack fontSize="small" />
              </IconButton>
              <Box>
                <Typography fontWeight={800} noWrap sx={{ maxWidth: { xs: 160, sm: 320 }, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                  {activeQuiz.title}
                </Typography>
                {gameMode === 'per_question' && myScore > 0 && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Star sx={{ fontSize: 12, color: '#f59e0b' }} />
                    <Typography sx={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>{myScore} correct so far</Typography>
                  </Stack>
                )}
              </Box>
            </Stack>

            {/* Timer */}
            {gameMode === 'per_question' && currentQuestion && !questionEnded && (
              <CircleTimer value={questionTimeLeft} max={currentQuestion.timeLimit} isLow={pqTimerLow} label="sec" />
            )}
            {gameMode === 'total_timer' && gameStarted && !ttSubmitted && ttTimeLeft > 0 && (
              <CircleTimer value={ttTimeLeft} max={activeQuiz.duration} isLow={ttTimerLow} label="left" />
            )}
          </Stack>

          {/* Progress bar */}
          {questionLabel && (
            <Box mb={3}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  Question {questionLabel}
                </Typography>
                {gameMode === 'total_timer' && (
                  <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                    {Object.keys(ttAnswers).length}/{ttQuestions.length} answered
                  </Typography>
                )}
                {gameMode === 'per_question' && (
                  <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                    Score {myScore}/{answeredCount}
                  </Typography>
                )}
              </Stack>
              <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <Box sx={{
                  height: '100%', borderRadius: 3,
                  background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                  width: `${progressPct}%`,
                  transition: 'width 0.5s ease',
                  boxShadow: '0 0 8px rgba(99,102,241,0.6)',
                }} />
              </Box>
            </Box>
          )}

          {/* ── Waiting screen ── */}
          {!gameStarted && !currentQuestion && (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Box sx={{
                width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 3,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': { '0%,100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0.4)' }, '50%': { boxShadow: '0 0 0 20px rgba(99,102,241,0)' } },
              }}>
                <AccessTime sx={{ fontSize: 36, color: 'white' }} />
              </Box>
              <Typography variant="h5" fontWeight={800} mb={1}>Waiting for game to start…</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>The quiz will begin shortly. Get ready!</Typography>
              <Stack direction="row" justifyContent="center" spacing={2} mt={4}>
                {[0, 1, 2].map((i) => (
                  <Box key={i} sx={{
                    width: 10, height: 10, borderRadius: '50%',
                    bgcolor: '#6366f1', opacity: 0.4,
                    animation: `bounce 1.4s ${i * 0.2}s infinite`,
                    '@keyframes bounce': { '0%,80%,100%': { transform: 'scale(0)' }, '40%': { transform: 'scale(1)', opacity: 1 } },
                  }} />
                ))}
              </Stack>
            </Box>
          )}

          {/* ── Game Over ── */}
          {gameOver && (
            <Box sx={{
              textAlign: 'center', py: 6,
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 4,
            }}>
              <Typography sx={{ fontSize: 56, mb: 1 }}>🏆</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ background: 'linear-gradient(90deg,#f59e0b,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Game Over!
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', mt: 1 }}>Calculating leaderboard…</Typography>
            </Box>
          )}

          {/* ── PER-QUESTION mode ── */}
          {gameMode === 'per_question' && currentQuestion && !gameOver && (
            <>
              {/* Answer feedback */}
              {questionEnded && (
                <Box sx={{
                  mb: 2, p: 1.5, borderRadius: 2, textAlign: 'center',
                  bgcolor: selectedAnswer === questionEnded.correctAnswer
                    ? 'rgba(34,197,94,0.15)' : selectedAnswer === -1
                    ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                  border: '1px solid',
                  borderColor: selectedAnswer === questionEnded.correctAnswer ? 'rgba(34,197,94,0.4)' : selectedAnswer === -1 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)',
                }}>
                  <Typography fontWeight={700} sx={{ color: selectedAnswer === questionEnded.correctAnswer ? '#86efac' : selectedAnswer === -1 ? '#fde68a' : '#fca5a5' }}>
                    {selectedAnswer === -1
                      ? `⏱ Time's up! Correct: ${questionEnded.correctOption}`
                      : selectedAnswer === questionEnded.correctAnswer
                      ? '✅ Correct! Well done!'
                      : `❌ Wrong! Correct: ${questionEnded.correctOption}`}
                  </Typography>
                </Box>
              )}

              {/* Question card */}
              <Box sx={{
                mb: 3, p: { xs: 2, md: 3 }, borderRadius: 4,
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                <Typography sx={{ fontSize: { xs: '1rem', md: '1.2rem' }, fontWeight: 700, lineHeight: 1.6, color: 'white' }}>
                  {currentQuestion.question}
                </Typography>
              </Box>

              {/* Options */}
              <Stack spacing={1.5}>
                {currentQuestion.options.map((opt, idx) => (
                  <OptionButton key={idx} idx={idx} text={opt}
                    selected={selectedAnswer} ended={questionEnded}
                    onClick={() => handleSelectAnswer(idx)}
                  />
                ))}
              </Stack>

              {/* Per-question progress bar under options */}
              {!questionEnded && (
                <Box sx={{ mt: 3, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <Box sx={{
                    height: '100%', borderRadius: 2,
                    background: pqTimerLow ? '#ef4444' : 'linear-gradient(90deg,#6366f1,#a855f7)',
                    width: `${currentQuestion.timeLimit > 0 ? (questionTimeLeft / currentQuestion.timeLimit) * 100 : 0}%`,
                    transition: 'width 0.9s linear',
                    boxShadow: pqTimerLow ? '0 0 8px rgba(239,68,68,0.8)' : '0 0 8px rgba(99,102,241,0.6)',
                  }} />
                </Box>
              )}

              {questionEnded && !gameOver && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                    Next question coming up…
                  </Typography>
                </Box>
              )}
            </>
          )}

          {/* ── TOTAL TIMER mode ── */}
          {gameMode === 'total_timer' && gameStarted && ttQ && !gameOver && (
            <>
              {ttSubmitted && (
                <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', textAlign: 'center' }}>
                  <Typography fontWeight={700} sx={{ color: '#a5b4fc' }}>
                    {ttTimeLeft === 0 ? "⏱ Time's up! Your answers have been submitted." : '✅ Submitted! Waiting for quiz to end…'}
                  </Typography>
                </Box>
              )}

              {/* Question card */}
              <Box sx={{
                mb: 3, p: { xs: 2, md: 3 }, borderRadius: 4,
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                <Typography sx={{ fontSize: { xs: '1rem', md: '1.2rem' }, fontWeight: 700, lineHeight: 1.6, color: 'white' }}>
                  {ttQ.question}
                </Typography>
              </Box>

              <Stack spacing={1.5} mb={3}>
                {ttQ.options.map((opt, idx) => {
                  const isSelected = ttSelected === idx;
                  const locked     = ttSubmitted;
                  return (
                    <Box key={idx}
                      onClick={() => !locked && handleTtSelect(idx)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        p: '14px 18px', borderRadius: 3, border: '1.5px solid',
                        borderColor: isSelected ? OPTION_COLORS[idx % 4] : 'rgba(255,255,255,0.1)',
                        bgcolor: isSelected ? `${OPTION_COLORS[idx % 4]}33` : 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.9)',
                        cursor: locked ? 'default' : 'pointer',
                        boxShadow: isSelected ? `0 0 20px ${OPTION_COLORS[idx % 4]}40` : 'none',
                        transition: 'all 0.2s',
                        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                        '&:hover': locked ? {} : { bgcolor: `${OPTION_COLORS[idx % 4]}22`, borderColor: OPTION_COLORS[idx % 4] },
                      }}
                    >
                      <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: isSelected ? OPTION_COLORS[idx % 4] : 'rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                        {isSelected
                          ? <Check sx={{ fontSize: 16, color: 'white' }} />
                          : <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>{OPTION_LABELS[idx]}</Typography>
                        }
                      </Box>
                      <Typography sx={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.95rem', flex: 1, lineHeight: 1.4 }}>{opt}</Typography>
                    </Box>
                  );
                })}
              </Stack>

              {/* Question dots + navigation */}
              <Box sx={{
                p: 2, borderRadius: 3,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                {/* Dot grid */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2, justifyContent: 'center' }}>
                  {ttQuestions.map((_, idx) => {
                    const isCurrent  = idx === ttCurrentIdx;
                    const isAnswered = ttAnswers[idx] !== undefined;
                    return (
                      <Box key={idx} onClick={() => setTtCurrentIdx(idx)}
                        sx={{
                          width: 28, height: 28, borderRadius: 1, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                          background: isCurrent
                            ? 'linear-gradient(135deg,#6366f1,#a855f7)'
                            : isAnswered ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)',
                          border: '1px solid',
                          borderColor: isCurrent ? '#6366f1' : isAnswered ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)',
                          boxShadow: isCurrent ? '0 0 8px rgba(99,102,241,0.6)' : 'none',
                          transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                        }}
                      >
                        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: isAnswered || isCurrent ? 'white' : 'rgba(255,255,255,0.4)' }}>
                          {idx + 1}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>

                {/* Prev / Submit / Next */}
                <Stack direction="row" spacing={1.5} justifyContent="space-between">
                  <Button
                    variant="outlined" startIcon={<ArrowBack />}
                    disabled={ttCurrentIdx === 0}
                    onClick={() => setTtCurrentIdx((i) => i - 1)}
                    sx={{
                      flex: 1, borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)',
                      '&:hover': { borderColor: '#6366f1', color: '#a5b4fc' },
                      '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' },
                    }}
                  >
                    Prev
                  </Button>

                  {ttCurrentIdx === ttQuestions.length - 1 ? (
                    <Button
                      variant="contained" endIcon={<Send />}
                      disabled={ttSubmitted}
                      onClick={handleTtSubmit}
                      sx={{ flex: 1, background: 'linear-gradient(135deg,#22c55e,#16a34a)', fontWeight: 700, '&:hover': { background: 'linear-gradient(135deg,#16a34a,#15803d)' } }}
                    >
                      Submit
                    </Button>
                  ) : (
                    <Button
                      variant="contained" endIcon={<ArrowForward />}
                      onClick={() => setTtCurrentIdx((i) => i + 1)}
                      sx={{ flex: 1, background: 'linear-gradient(135deg,#6366f1,#a855f7)', fontWeight: 700 }}
                    >
                      Next
                    </Button>
                  )}
                </Stack>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
