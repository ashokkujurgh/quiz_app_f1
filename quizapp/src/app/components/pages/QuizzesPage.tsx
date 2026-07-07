import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Box, Grid, Typography, TextField, InputAdornment,
  CircularProgress, Alert, Button, Chip, Stack, Card, CardContent,
  CardMedia, Skeleton, Snackbar, Tabs, Tab,
} from '@mui/material';
import { Search, Timer, Quiz as QuizIcon, Add, EmojiEvents, Mail, History, PlayArrow } from '@mui/icons-material';

import { io } from 'socket.io-client';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { startQuiz } from '../../store/slices/quizSlice';
import { EmptyState } from '../shared/EmptyState';
import type { Quiz, QuizQuestion, QuizTopic } from '../../types';
import { formatDuration } from '../../utils/formatDuration';

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;
const API = import.meta.env.VITE_API_URL ?? '';

// ── API types ─────────────────────────────────────────────────────────────────
interface ApiTopic    { _id: string; name: string; isActive?: boolean }
interface ApiSubTopic { _id: string; name: string; topic: string; isActive?: boolean }

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
  scheduledAt?: string | null;
  startedAt?: string | null;
}

interface ApiQuestion {
  _id: string;
  text: string;
  options: { text: string }[];
  correctOption: number;
  description?: string;
}

function mapQuiz(q: ApiQuiz): Omit<Quiz, 'questions'> & { _apiId: string; status: string } {
  return {
    _apiId: q._id, id: q._id,
    title: q.title,
    description: q.description || 'Test your knowledge!',
    category: 'General Science' as QuizTopic,
    duration: (q.durationMinutes ?? 10) * 60,
    difficulty: (q.difficulty as Quiz['difficulty']) ?? 'Medium',
    plays: 0, rating: 4.5, createdBy: {} as any,
    thumbnail: q.image && q.image.trim() !== '' ? q.image : undefined,
    questionCount: q.questionCount,
    status: q.status,
    scheduledAt: q.scheduledAt ?? null,
    startedAt: q.startedAt ?? null,
    questions: [],
  } as any;
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


// ── Quiz Card ─────────────────────────────────────────────────────────────────
function QuizCard({ quiz, loading, onPlay, onHistory, onTest }: {
  quiz: ReturnType<typeof mapQuiz>;
  loading: boolean;
  onPlay: () => void;
  onHistory?: () => void;
  onTest?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const mins = Math.floor(quiz.duration / 60);
  const diffColor = quiz.difficulty === 'Easy' ? 'success' : quiz.difficulty === 'Hard' ? 'error' : 'warning';
  const isPast = quiz.status === 'completed';

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
      {quiz.thumbnail && !imgError ? (
        <CardMedia component="img" height="140" image={quiz.thumbnail} alt={quiz.title} sx={{ objectFit: 'cover' }} onError={() => setImgError(true)} />
      ) : (
        <Box sx={{ height: 100, background: 'linear-gradient(135deg, #5563DE 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <QuizIcon sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
        </Box>
      )}

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" spacing={1} mb={1} flexWrap="wrap" alignItems="center">
          <Chip label={quiz.difficulty} color={diffColor as any} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
          {quiz.status === 'active' && (
            <Chip size="small" color="success" label={
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor', display: 'inline-block', animation: 'pulse 1.2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
                Live Now
              </Box>
            } sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
          )}
          {quiz.status === 'scheduled' && (
            <Chip size="small" color="info" label="Scheduled" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
          )}
          {isPast && <Chip size="small" label="Ended" sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: 'action.selected' }} />}
          {(quiz as any).participation === 'invite_only' && (
            <Chip size="small" color="secondary" label="Invite Only" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
          )}
        </Stack>

        {/* Start time */}
        {(quiz as any).scheduledAt && quiz.status === 'scheduled' && (
          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, color: 'info.main', fontWeight: 600 }}>
            🕐 Starts {new Date((quiz as any).scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </Typography>
        )}
        {(quiz as any).startedAt && quiz.status === 'active' && (
          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, color: 'success.main', fontWeight: 600 }}>
            🟢 Started {new Date((quiz as any).startedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </Typography>
        )}

        <Typography variant="subtitle1" fontWeight={700} mb={0.5} sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {quiz.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 2, flex: 1 }}>
          {quiz.description}
        </Typography>

        <Stack direction="row" spacing={2} mb={2}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Timer sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">{formatDuration(mins)}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <QuizIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">{quiz.questionCount ?? '?'} questions</Typography>
          </Stack>
        </Stack>

        {isPast ? (
          <Stack spacing={1}>
            <Button
              variant="outlined" fullWidth startIcon={<History />}
              onClick={onHistory}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Game History
            </Button>
            <Button
              variant="contained" fullWidth startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
              onClick={onTest} disabled={loading}
              sx={{ borderRadius: 2, fontWeight: 700, color: 'white !important' }}
            >
              {loading ? 'Loading…' : 'Play as Test'}
            </Button>
          </Stack>
        ) : (
          <Button
            variant="contained" fullWidth onClick={onPlay}
            disabled={loading || quiz.status === 'cancelled' || quiz.status === 'draft'}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            color={quiz.status === 'active' ? 'success' : 'primary'}
            sx={{ borderRadius: 2, fontWeight: 700, color: 'white !important' }}
          >
            {loading ? 'Loading…' : quiz.status === 'active' ? '🎮 Join Live' : quiz.status === 'draft' ? 'Not Ready' : quiz.status === 'cancelled' ? 'Cancelled' : 'Play Now'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Shared quiz grid ──────────────────────────────────────────────────────────
function QuizGrid({
  quizzes, loading, error, search, onSearchChange, onPlay, onHistory, onTest, playingId, emptyMsg,
}: {
  quizzes: ReturnType<typeof mapQuiz>[];
  loading: boolean; error: string; search: string;
  onSearchChange: (v: string) => void;
  onPlay: (q: ReturnType<typeof mapQuiz>) => void;
  onHistory?: (q: ReturnType<typeof mapQuiz>) => void;
  onTest?: (q: ReturnType<typeof mapQuiz>) => void;
  playingId: string | null;
  emptyMsg?: string;
}) {
  const filtered = quizzes.filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    q.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TextField
        fullWidth placeholder="Search quizzes…" value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        sx={{ mb: 2.5 }} size="small"
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <EmptyState icon={QuizIcon} title="No quizzes found" description={emptyMsg ?? 'Try a different filter or search term.'} />
      ) : (
        <Grid container spacing={2}>
          {filtered.map((q) => (
            <Grid key={q.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <QuizCard
                quiz={q} loading={playingId === q.id}
                onPlay={() => onPlay(q)}
                onHistory={onHistory ? () => onHistory(q) : undefined}
                onTest={onTest ? () => onTest(q) : undefined}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function QuizzesPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const dispatch  = useAppDispatch();
  const { accessToken } = useAppSelector((s) => s.auth);

  const [mainTab, setMainTab]       = useState(0);
  const [search, setSearch]         = useState('');
  const [pastSearch, setPastSearch] = useState('');
  const [inviteSearch, setInviteSearch] = useState('');
  const [playingId, setPlayingId]   = useState<string | null>(null);
  const [liveAlert, setLiveAlert] = useState<{ quizId: string; title: string } | null>(null);
  const [createdSnack, setCreatedSnack] = useState(!!(location.state as any)?.created);

  // Active & Upcoming (active + scheduled)
  const [activeQuizzes, setActiveQuizzes] = useState<ReturnType<typeof mapQuiz>[]>([]);
  const [activeLoading, setActiveLoading] = useState(true);
  const [activeError, setActiveError]     = useState('');

  // Past (completed)
  const [pastQuizzes, setPastQuizzes]   = useState<ReturnType<typeof mapQuiz>[]>([]);
  const [pastLoading, setPastLoading]   = useState(false);
  const [pastError, setPastError]       = useState('');

  // Invited
  const [invitedQuizzes, setInvitedQuizzes] = useState<ReturnType<typeof mapQuiz>[]>([]);
  const [invitedLoading, setInvitedLoading] = useState(false);
  const [invitedError, setInvitedError]     = useState('');

  const activeQuizzesRef = useRef(activeQuizzes);
  useEffect(() => { activeQuizzesRef.current = activeQuizzes; }, [activeQuizzes]);

  // Socket for live notifications
  useEffect(() => {
    if (!accessToken) return;
    const socket = io(SOCKET_URL, { path: '/quiz.io/', auth: { token: accessToken }, transports: ['websocket', 'polling'] });
    socket.on('quiz_activated', ({ quizId, title }: { quizId: string; title: string }) => {
      const match = activeQuizzesRef.current.find((q) => q.id === quizId);
      if (match) setLiveAlert({ quizId, title });
      setActiveQuizzes((prev) => prev.map((q) => q.id === quizId ? { ...q, status: 'active' } : q));
    });
    return () => { socket.disconnect(); };
  }, [accessToken]);

  // Fetch active + scheduled quizzes
  useEffect(() => {
    setActiveLoading(true); setActiveError('');
    const fetchActive    = fetch(`${API}/api/quizzes?status=active`,    { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} }).then((r) => r.json());
    const fetchScheduled = fetch(`${API}/api/quizzes?status=scheduled`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} }).then((r) => r.json());
    Promise.all([fetchActive, fetchScheduled])
      .then(([a, s]) => {
        const combined = [
          ...((a.quizzes ?? []) as ApiQuiz[]),
          ...((s.quizzes ?? []) as ApiQuiz[]),
        ].map(mapQuiz);
        setActiveQuizzes(combined);
      })
      .catch((e) => setActiveError(e.message))
      .finally(() => setActiveLoading(false));
  }, [accessToken]);

  // Fetch invited quizzes on tab switch
  useEffect(() => {
    if (mainTab !== 2 || !accessToken) return;
    setInvitedLoading(true); setInvitedError('');
    fetch(`${API}/api/quizzes/my/invited`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.message ?? 'Failed');
        setInvitedQuizzes((d.quizzes as ApiQuiz[]).map(mapQuiz));
      })
      .catch((e) => setInvitedError(e.message))
      .finally(() => setInvitedLoading(false));
  }, [mainTab, accessToken]);

  // Fetch past (completed) quizzes on tab switch
  useEffect(() => {
    if (mainTab !== 1) return;
    setPastLoading(true); setPastError('');
    fetch(`${API}/api/quizzes?status=completed`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.message ?? 'Failed');
        setPastQuizzes((d.quizzes as ApiQuiz[]).map(mapQuiz));
      })
      .catch((e) => setPastError(e.message))
      .finally(() => setPastLoading(false));
  }, [mainTab, accessToken]);

  const handlePlay = async (q: ReturnType<typeof mapQuiz>) => {
    if (!accessToken) { navigate('/login'); return; }
    setPlayingId(q.id);
    try {
      const res  = await fetch(`${API}/api/quizzes/${q.id}/questions`, { credentials: 'include', headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.message ?? 'Failed to load questions');
      const questions: QuizQuestion[] = (data.questions as ApiQuestion[]).map(mapQuestion);
      if (questions.length === 0) throw new Error('This quiz has no questions yet.');
      dispatch(startQuiz({ ...q, questions }));
      navigate(`/quiz/play/${q.id}`);
    } catch (e) {
      setActiveError((e as Error).message);
    } finally {
      setPlayingId(null);
    }
  };

  const handleHistory = (q: ReturnType<typeof mapQuiz>) => {
    navigate('/history', { state: { highlightQuizId: q.id } });
  };

  const handleTest = async (q: ReturnType<typeof mapQuiz>) => {
    if (!accessToken) { navigate('/login'); return; }
    setPlayingId(q.id);
    try {
      const res  = await fetch(`${API}/api/quizzes/${q.id}/questions`, { credentials: 'include', headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.message ?? 'Failed to load questions');
      const questions = (data.questions as ApiQuestion[]);
      if (questions.length === 0) throw new Error('This quiz has no questions yet.');
      navigate('/practice', {
        state: {
          subTopicId:   null,
          subTopicName: q.title,
          count:        questions.length,
          questions,        // pass questions directly — skip API fetch in PracticeQuizPage
        },
      });
    } catch (e) {
      setPastError((e as Error).message);
    } finally {
      setPlayingId(null);
    }
  };

  return (
    <Box>
      {/* Header row */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={800} mb={0.5}>Quizzes</Typography>
          <Typography variant="body2" color="text.secondary">Challenge yourself and compete with others</Typography>
        </Box>
        {accessToken && (
          <Button
            variant="contained" startIcon={<Add />}
            onClick={() => navigate('/quiz/create')}
            sx={{ fontWeight: 700, borderRadius: 2, flexShrink: 0, ml: 2 }}
          >
            Create Quiz
          </Button>
        )}
      </Stack>

      {/* Live game alert */}
      <Snackbar
        open={!!liveAlert} autoHideDuration={10000} onClose={() => setLiveAlert(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        message={`🎮 "${liveAlert?.title}" is LIVE now!`}
        action={
          <Button size="small" color="warning" variant="contained"
            onClick={async () => {
              const q = allQuizzesRef.current.find((q) => q.id === liveAlert?.quizId);
              setLiveAlert(null);
              if (q) await handlePlay(q);
            }}
          >Join Now</Button>
        }
      />

      {/* Quiz created success */}
      <Snackbar
        open={createdSnack} autoHideDuration={4000} onClose={() => setCreatedSnack(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        message="✅ Quiz created successfully!"
      />

      {/* Main tabs */}
      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<QuizIcon fontSize="small" />} iconPosition="start" label="Active & Upcoming" />
        <Tab icon={<EmojiEvents fontSize="small" />} iconPosition="start" label="Past Quizzes" />
        <Tab icon={<Mail fontSize="small" />} iconPosition="start" label="My Invites" />
      </Tabs>

      {/* ── Active & Upcoming tab ── */}
      {mainTab === 0 && (
        <QuizGrid
          quizzes={activeQuizzes} loading={activeLoading} error={activeError}
          search={search} onSearchChange={setSearch}
          onPlay={handlePlay} playingId={playingId}
          emptyMsg="No active or upcoming quizzes right now."
        />
      )}

      {/* ── Past Quizzes tab ── */}
      {mainTab === 1 && (
        <QuizGrid
          quizzes={pastQuizzes} loading={pastLoading} error={pastError}
          search={pastSearch} onSearchChange={setPastSearch}
          onPlay={handlePlay} onHistory={handleHistory} onTest={handleTest}
          playingId={playingId}
          emptyMsg="No completed quizzes yet."
        />
      )}

      {/* ── My Invites tab ── */}
      {mainTab === 2 && (
        !accessToken ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            <Button variant="text" onClick={() => navigate('/login')} sx={{ p: 0, minWidth: 0, fontWeight: 700 }}>Log in</Button>
            {' '}to see your invited games.
          </Alert>
        ) : (
          <QuizGrid
            quizzes={invitedQuizzes} loading={invitedLoading} error={invitedError}
            search={inviteSearch} onSearchChange={setInviteSearch}
            onPlay={handlePlay} playingId={playingId}
            emptyMsg="When someone invites you to a quiz, it will appear here."
          />
        )
      )}
    </Box>
  );
}
