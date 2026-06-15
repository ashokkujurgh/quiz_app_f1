import { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Stack, Card, CardContent,
  Avatar, Chip, LinearProgress, CircularProgress, Alert,
  Collapse, IconButton, Divider,
} from '@mui/material';
import { EmojiEvents, WorkspacePremium, ExpandMore, ExpandLess, Quiz as QuizIcon } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { EmptyState } from '../shared/EmptyState';
import { apiFetch } from '../../utils/apiFetch';

const API = import.meta.env.VITE_API_URL ?? '';

const MEDAL_COLOR = ['#f59e0b', '#9ca3af', '#b45309'];
const MEDAL_EMOJI = ['🥇', '🥈', '🥉'];

interface GlobalEntry {
  rank:           number;
  userId:         string;
  userName:       string;
  userAvatar?:    string;
  totalGames:     number;
  totalScore:     number;
  totalQuestions: number;
  avgPercentage:  number;
  perfectScores:  number;
}

interface CompletedQuiz {
  _id:             string;
  title:           string;
  description?:    string;
  durationMinutes: number;
  endedAt:         string;
  questionCount:   number;
}

interface GameEntry {
  rank:        number;
  userId:      string;
  userName:    string;
  userAvatar?: string;
  score:       number;
  total:       number;
  percentage:  number;
  timeTaken:   number;
}

// ── Podium ───────────────────────────────────────────────────────────────────
function Podium({ entries }: { entries: GlobalEntry[] }) {
  const order = [entries[1], entries[0], entries[2]].filter(Boolean);
  const heights = [80, 110, 65];
  const sizes   = [56, 72, 48];
  const medals  = ['🥈', '🥇', '🥉'];
  const colors  = ['#9ca3af', '#f59e0b', '#b45309'];

  if (entries.length < 1) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-end" justifyContent="center" spacing={2} sx={{ pt: 2 }}>
          {order.map((e, i) => (
            <Stack key={e.userId} alignItems="center" spacing={0.5}>
              {i === 1 && <WorkspacePremium sx={{ color: '#f59e0b', fontSize: 24, mb: 0.5 }} />}
              <Avatar
                src={e.userAvatar}
                sx={{ width: sizes[i], height: sizes[i], border: `3px solid ${colors[i]}`, fontSize: sizes[i] * 0.4 }}
              >
                {e.userName[0]}
              </Avatar>
              <Typography fontSize={20}>{medals[i]}</Typography>
              <Box
                sx={{
                  width: 88, height: heights[i],
                  bgcolor: `${colors[i]}18`,
                  border: `2px solid ${colors[i]}`,
                  borderBottom: 'none',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  px: 0.5,
                }}
              >
                <Typography variant="caption" fontWeight={700} textAlign="center" noWrap sx={{ maxWidth: '100%' }}>
                  {e.userName.split(' ')[0]}
                </Typography>
                <Typography variant="caption" sx={{ color: colors[i], fontWeight: 700 }}>
                  {e.avgPercentage}%
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  {e.totalGames} games
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Global Leaderboard Tab ────────────────────────────────────────────────────
function GlobalTab() {
  const { user } = useAppSelector((s) => s.auth);
  const [entries, setEntries] = useState<GlobalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch(`${API}/api/quizzes/leaderboard/global`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.message ?? 'Failed');
        setEntries(d.leaderboard);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error">{error}</Alert>;
  if (entries.length === 0) return <EmptyState icon={EmojiEvents} title="No data yet" description="Complete a game to appear on the leaderboard." />;

  const maxPct = entries[0]?.avgPercentage ?? 100;

  return (
    <>
      <Podium entries={entries.slice(0, 3)} />
      <Stack spacing={1}>
        {entries.map((e) => {
          const isMe = user?.id === e.userId;
          return (
            <Card key={e.userId} sx={{ border: isMe ? '2px solid' : '1px solid', borderColor: isMe ? 'primary.main' : 'divider' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography
                    variant="h6" fontWeight={800} textAlign="center"
                    sx={{ width: 36, color: e.rank <= 3 ? MEDAL_COLOR[e.rank - 1] : 'text.secondary', flexShrink: 0 }}
                  >
                    {e.rank <= 3 ? MEDAL_EMOJI[e.rank - 1] : e.rank}
                  </Typography>
                  <Avatar src={e.userAvatar} sx={{ width: 40, height: 40, fontSize: 16 }}>{e.userName[0]}</Avatar>
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>{e.userName}</Typography>
                      {isMe && <Chip label="You" size="small" color="primary" sx={{ height: 18, fontSize: '0.6rem' }} />}
                    </Stack>
                    <Stack direction="row" spacing={1.5} mt={0.25}>
                      <Typography variant="caption" color="text.secondary">{e.totalGames} games</Typography>
                      {e.perfectScores > 0 && (
                        <Typography variant="caption" color="warning.main">🏆 {e.perfectScores} perfect</Typography>
                      )}
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(e.avgPercentage / maxPct) * 100}
                      sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                    />
                  </Box>
                  <Box textAlign="right" flexShrink={0}>
                    <Typography variant="subtitle1" fontWeight={800} color="primary.main">{e.avgPercentage}%</Typography>
                    <Typography variant="caption" color="text.secondary">avg</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </>
  );
}

// ── Per-Game Leaderboard Tab ──────────────────────────────────────────────────
function ByGameTab() {
  const { user } = useAppSelector((s) => s.auth);
  const [quizzes, setQuizzes]   = useState<CompletedQuiz[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [gameData, setGameData] = useState<Record<string, GameEntry[]>>({});
  const [gameLoading, setGameLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`${API}/api/quizzes/completed/list`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.message ?? 'Failed');
        setQuizzes(d.quizzes);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleQuiz = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (gameData[id]) return;
    setGameLoading((p) => ({ ...p, [id]: true }));
    try {
      const r = await apiFetch(`${API}/api/quizzes/${id}/leaderboard`);
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setGameData((p) => ({ ...p, [id]: d.leaderboard }));
    } catch {
      setGameData((p) => ({ ...p, [id]: [] }));
    } finally {
      setGameLoading((p) => ({ ...p, [id]: false }));
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error">{error}</Alert>;
  if (quizzes.length === 0) return <EmptyState icon={QuizIcon} title="No completed games" description="Finished games will appear here with full leaderboards." />;

  return (
    <Stack spacing={1.5}>
      {quizzes.map((q) => {
        const isOpen   = expanded === q._id;
        const entries  = gameData[q._id] ?? [];
        const gLoading = gameLoading[q._id];
        const endDate  = new Date(q.endedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        return (
          <Card key={q._id}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: isOpen ? 2 : 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <QuizIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography variant="subtitle2" fontWeight={700} noWrap>{q.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{q.questionCount} questions · Ended {endDate}</Typography>
                </Box>
                <IconButton size="small" onClick={() => toggleQuiz(q._id)}>
                  {isOpen ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Stack>

              <Collapse in={isOpen}>
                <Divider sx={{ my: 1.5 }} />
                {gLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
                ) : entries.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={1}>No players recorded.</Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {entries.map((e) => {
                      const isMe   = user?.id === e.userId;
                      const mins   = Math.floor(e.timeTaken / 60);
                      const secs   = e.timeTaken % 60;
                      return (
                        <Stack key={e.userId} direction="row" spacing={1.5} alignItems="center"
                          sx={{ p: 1, borderRadius: 2, bgcolor: isMe ? 'primary.main' : e.rank % 2 === 0 ? 'action.hover' : 'transparent' }}
                        >
                          <Typography fontWeight={800} sx={{ width: 24, textAlign: 'center', color: isMe ? 'white' : e.rank <= 3 ? MEDAL_COLOR[e.rank - 1] : 'text.secondary', fontSize: e.rank <= 3 ? '1rem' : '0.85rem' }}>
                            {e.rank <= 3 ? MEDAL_EMOJI[e.rank - 1] : `#${e.rank}`}
                          </Typography>
                          <Avatar src={e.userAvatar} sx={{ width: 30, height: 30, fontSize: 12 }}>{e.userName[0]}</Avatar>
                          <Typography variant="body2" fontWeight={isMe ? 700 : 500} flex={1} noWrap sx={{ color: isMe ? 'white' : 'text.primary' }}>
                            {e.userName}{isMe ? ' (You)' : ''}
                          </Typography>
                          <Typography variant="caption" sx={{ color: isMe ? 'rgba(255,255,255,0.8)' : 'text.secondary' }}>
                            {mins}:{secs.toString().padStart(2, '0')}
                          </Typography>
                          <Chip
                            label={`${e.score}/${e.total} · ${e.percentage}%`}
                            size="small"
                            sx={{ fontWeight: 700, bgcolor: isMe ? 'rgba(255,255,255,0.2)' : 'action.selected', color: isMe ? 'white' : 'text.primary', fontSize: '0.65rem' }}
                          />
                        </Stack>
                      );
                    })}
                  </Stack>
                )}
              </Collapse>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function LeaderboardPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" mb={2.5}>
        <EmojiEvents sx={{ color: 'warning.main', fontSize: 28 }} />
        <Typography variant="h5" fontWeight={800}>Leaderboard</Typography>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<EmojiEvents fontSize="small" />} iconPosition="start" label="Global Rankings" sx={{ fontWeight: 600 }} />
        <Tab icon={<QuizIcon fontSize="small" />} iconPosition="start" label="By Game" sx={{ fontWeight: 600 }} />
      </Tabs>

      {tab === 0 && <GlobalTab />}
      {tab === 1 && <ByGameTab />}
    </Box>
  );
}
