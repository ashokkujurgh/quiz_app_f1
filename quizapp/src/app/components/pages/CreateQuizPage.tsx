import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Box, Card, CardContent, Typography, Stack, TextField, Button,
  Tabs, Tab, Chip, Avatar, IconButton, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, InputAdornment,
  ToggleButton, ToggleButtonGroup, Divider, LinearProgress,
} from '@mui/material';
import {
  ArrowBack, Search, Add, Close, Check, Casino, ListAlt,
  People, Schedule, Timer,
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { Navbar } from '../layout/Navbar';

const API = import.meta.env.VITE_API_URL ?? '';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ApiTopic    { _id: string; name: string }
interface ApiSubTopic { _id: string; name: string; topic: string }
interface ApiQuestion { _id: string; text: string; options: { text: string }[]; correctOption: number; difficulty?: string }
interface ApiUser     { _id: string; name: string; email: string; username?: string; avatar?: string }

// ── User Search Chip ──────────────────────────────────────────────────────────
function ParticipantSearch({
  selected, onAdd, onRemove, token,
}: {
  selected: ApiUser[];
  onAdd: (u: ApiUser) => void;
  onRemove: (id: string) => void;
  token: string | null;
}) {
  const [q, setQ]           = useState('');
  const [results, setResults] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (val: string) => {
    setQ(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/auth/users/search?q=${encodeURIComponent(val)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        const selectedIds = new Set(selected.map((u) => u._id));
        setResults((d.users ?? []).filter((u: ApiUser) => !selectedIds.has(u._id)));
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  return (
    <Box>
      <TextField
        fullWidth size="small" placeholder="Search by name or email…"
        value={q} onChange={(e) => search(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
          endAdornment: loading ? <CircularProgress size={16} /> : null,
        }}
      />
      {results.length > 0 && (
        <Card variant="outlined" sx={{ mt: 0.5, maxHeight: 200, overflowY: 'auto' }}>
          {results.map((u) => (
            <Box key={u._id}
              onClick={() => { onAdd(u); setResults([]); setQ(''); }}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Avatar src={u.avatar} sx={{ width: 28, height: 28, fontSize: 12 }}>{u.name[0]}</Avatar>
              <Box flex={1} minWidth={0}>
                <Typography variant="caption" fontWeight={600} noWrap display="block">{u.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">{u.email}</Typography>
              </Box>
              <Add fontSize="small" color="primary" />
            </Box>
          ))}
        </Card>
      )}
      {selected.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={0.75} mt={1.5}>
          {selected.map((u) => (
            <Chip
              key={u._id}
              avatar={<Avatar src={u.avatar} sx={{ fontSize: '10px !important' }}>{u.name[0]}</Avatar>}
              label={u.name}
              size="small"
              onDelete={() => onRemove(u._id)}
              deleteIcon={<Close sx={{ fontSize: '14px !important' }} />}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ── Question Search Panel ─────────────────────────────────────────────────────
function QuestionPicker({
  selected, onToggle, token,
}: {
  selected: ApiQuestion[];
  onToggle: (q: ApiQuestion) => void;
  token: string | null;
}) {
  const [search, setSearch]   = useState('');
  const [results, setResults] = useState<ApiQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = (val: string) => {
    setSearch(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/questions?search=${encodeURIComponent(val)}&limit=30`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        setResults(d.questions ?? []);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  const selectedIds = new Set(selected.map((q) => q._id));

  return (
    <Box>
      <TextField
        fullWidth size="small" placeholder="Search questions by text…"
        value={search} onChange={(e) => doSearch(e.target.value)}
        sx={{ mb: 1 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
          endAdornment: loading ? <CircularProgress size={16} /> : null,
        }}
      />

      {selected.length > 0 && (
        <Box mb={1.5}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Selected ({selected.length})
          </Typography>
          <Stack spacing={0.5} mt={0.5}>
            {selected.map((q, i) => (
              <Box key={q._id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ width: 20, flexShrink: 0 }}>{i + 1}.</Typography>
                <Typography variant="caption" flex={1} noWrap>{q.text}</Typography>
                <IconButton size="small" onClick={() => onToggle(q)} sx={{ p: 0.25 }}>
                  <Close sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {results.length > 0 && (
        <Stack spacing={0.75}>
          {results.map((q) => {
            const isSelected = selectedIds.has(q._id);
            return (
              <Box key={q._id}
                onClick={() => onToggle(q)}
                sx={{
                  p: 1.25, borderRadius: 1.5, border: '1.5px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? 'primary.50' : 'background.paper',
                  cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 1,
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                <Box sx={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, mt: 0.1,
                  border: '2px solid', borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? 'primary.main' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected && <Check sx={{ fontSize: 12, color: 'white' }} />}
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography variant="caption" fontWeight={600} display="block" sx={{ lineHeight: 1.4 }}>{q.text}</Typography>
                  {q.difficulty && (
                    <Chip label={q.difficulty} size="small" sx={{ height: 16, fontSize: '0.6rem', mt: 0.5 }} />
                  )}
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}

      {results.length === 0 && search.length >= 2 && !loading && (
        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" py={2}>
          No questions found. Try different keywords.
        </Typography>
      )}
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function CreateQuizPage() {
  const navigate    = useNavigate();
  const { accessToken, user } = useAppSelector((s) => s.auth);

  // ── Form state ────────────────────────────────────────────────────────────
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [timeLimitPerQuestion, setTimeLimitPerQuestion] = useState<number | null>(null);
  const [timerMode, setTimerMode]   = useState<'total' | 'per_question'>('total');
  const [questionCount, setQuestionCount] = useState(10);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(); d.setMinutes(d.getMinutes() + 30);
    return d.toISOString().slice(0, 16);
  });
  const [participation, setParticipation] = useState<'public' | 'private' | 'invite_only'>('public');

  // ── Selection mode ────────────────────────────────────────────────────────
  const [selectionTab, setSelectionTab] = useState(0); // 0=Random 1=Manual

  // Random mode
  const [topics, setTopics]           = useState<ApiTopic[]>([]);
  const [subTopics, setSubTopics]     = useState<ApiSubTopic[]>([]);
  const [topicsLoaded, setTopicsLoaded] = useState(false);
  const [selectedTopic, setSelectedTopic]     = useState('');
  const [selectedSubTopic, setSelectedSubTopic] = useState('');

  const loadTopics = useCallback(async () => {
    if (topicsLoaded) return;
    const res  = await fetch(`${API}/api/topics`);
    const data = await res.json();
    setTopics(data.topics ?? []);
    setTopicsLoaded(true);
  }, [topicsLoaded]);

  const handleTopicChange = async (topicId: string) => {
    setSelectedTopic(topicId);
    setSelectedSubTopic('');
    if (!topicId) { setSubTopics([]); return; }
    const res  = await fetch(`${API}/api/topics/${topicId}/subtopics`);
    const data = await res.json();
    setSubTopics(data.subtopics ?? []);
  };

  // Manual mode
  const [selectedQuestions, setSelectedQuestions] = useState<ApiQuestion[]>([]);
  const toggleQuestion = (q: ApiQuestion) => {
    setSelectedQuestions((prev) =>
      prev.some((p) => p._id === q._id) ? prev.filter((p) => p._id !== q._id) : [...prev, q]
    );
  };

  // Participants
  const [participants, setParticipants] = useState<ApiUser[]>([]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const isManual = selectionTab === 1;

  const handleSubmit = async () => {
    setError('');
    if (!title.trim()) { setError('Quiz title is required.'); return; }
    if (isManual && selectedQuestions.length === 0) { setError('Please select at least one question.'); return; }
    if (!isManual && !selectedTopic) { setError('Please select a topic for random questions.'); return; }

    const body: Record<string, unknown> = {
      title:                title.trim(),
      description:          description.trim(),
      durationMinutes,
      timeLimitPerQuestion: timerMode === 'per_question' ? timeLimitPerQuestion ?? 30 : null,
      scheduledAt:          new Date(scheduledAt).toISOString(),
      participation,
      allowedUsers:         participants.map((u) => u._id),
      scheduleType:         'once',
    };

    if (isManual) {
      body.selectionMode = 'manual';
      body.questionCount = selectedQuestions.length;
      // Will add questions via addQuestions after create
    } else {
      body.selectionMode = 'random';
      body.questionCount = questionCount;
      body.topic         = selectedTopic;
      if (selectedSubTopic) body.subTopic = selectedSubTopic;
    }

    setSubmitting(true);
    try {
      const res  = await fetch(`${API}/api/quizzes`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message ?? 'Failed to create quiz.');

      const quizId = data.quiz._id;

      // For manual mode, add the selected questions
      if (isManual && selectedQuestions.length > 0) {
        const addRes = await fetch(`${API}/api/quizzes/${quizId}/questions`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body:    JSON.stringify({ questionIds: selectedQuestions.map((q) => q._id) }),
        });
        const addData = await addRes.json();
        if (!addData.success) throw new Error(addData.message ?? 'Failed to add questions.');
      }

      navigate('/quizzes', { state: { created: true } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar onMenuToggle={() => {}} />
      <Box sx={{ pt: '64px', maxWidth: 760, mx: 'auto', width: '100%', p: { xs: 2, md: 3 } }}>

        {/* Header */}
        <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
          <IconButton onClick={() => navigate('/quizzes')}><ArrowBack /></IconButton>
          <Box>
            <Typography variant="h5" fontWeight={800}>Create Quiz</Typography>
            <Typography variant="caption" color="text.secondary">Set up your own quiz game</Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Stack spacing={2.5}>

          {/* ── Basic Info ── */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>Basic Info</Typography>
              <Stack spacing={2}>
                <TextField
                  label="Quiz Title" fullWidth required
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Friday Science Quiz"
                />
                <TextField
                  label="Description" fullWidth multiline rows={2}
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this quiz about?"
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Duration (minutes)" type="number" sx={{ flex: 1 }}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))}
                    InputProps={{ inputProps: { min: 1, max: 180 } }}
                  />
                  <TextField
                    label="Start Time" type="datetime-local" sx={{ flex: 1 }}
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* ── Timer Mode ── */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Timer Mode</Typography>
              <ToggleButtonGroup
                value={timerMode} exclusive
                onChange={(_, v) => v && setTimerMode(v)}
                size="small" fullWidth
              >
                <ToggleButton value="total">
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Timer sx={{ fontSize: 16 }} />
                    <Box textAlign="left">
                      <Typography variant="caption" fontWeight={700} display="block">Total Timer</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">Free navigation</Typography>
                    </Box>
                  </Stack>
                </ToggleButton>
                <ToggleButton value="per_question">
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Schedule sx={{ fontSize: 16 }} />
                    <Box textAlign="left">
                      <Typography variant="caption" fontWeight={700} display="block">Per Question</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">Auto-advance</Typography>
                    </Box>
                  </Stack>
                </ToggleButton>
              </ToggleButtonGroup>

              {timerMode === 'per_question' && (
                <TextField
                  label="Seconds per question" type="number" size="small" sx={{ mt: 2, maxWidth: 220 }}
                  value={timeLimitPerQuestion ?? 30}
                  onChange={(e) => setTimeLimitPerQuestion(Math.max(5, Number(e.target.value)))}
                  InputProps={{ inputProps: { min: 5, max: 300 }, endAdornment: <InputAdornment position="end">sec</InputAdornment> }}
                />
              )}
            </CardContent>
          </Card>

          {/* ── Questions ── */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>Questions</Typography>
              <Tabs value={selectionTab} onChange={(_, v) => setSelectionTab(v)} sx={{ mb: 2 }}>
                <Tab icon={<Casino fontSize="small" />} iconPosition="start" label="Random Pick" />
                <Tab icon={<ListAlt fontSize="small" />} iconPosition="start" label="Manual Select" />
              </Tabs>

              {selectionTab === 0 && (
                <Stack spacing={2}>
                  <TextField
                    label="Number of questions" type="number" size="small"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Math.max(1, Number(e.target.value)))}
                    InputProps={{ inputProps: { min: 1, max: 100 } }}
                    sx={{ maxWidth: 220 }}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControl size="small" sx={{ flex: 1 }} onClick={loadTopics}>
                      <InputLabel>Topic</InputLabel>
                      <Select value={selectedTopic} label="Topic" onChange={(e) => handleTopicChange(e.target.value)}>
                        <MenuItem value=""><em>Any Topic</em></MenuItem>
                        {topics.map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ flex: 1 }} disabled={!selectedTopic}>
                      <InputLabel>Sub-topic (optional)</InputLabel>
                      <Select value={selectedSubTopic} label="Sub-topic (optional)" onChange={(e) => setSelectedSubTopic(e.target.value)}>
                        <MenuItem value=""><em>All sub-topics</em></MenuItem>
                        {subTopics.map((s) => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Stack>
                </Stack>
              )}

              {selectionTab === 1 && (
                <Box>
                  <QuestionPicker
                    selected={selectedQuestions}
                    onToggle={toggleQuestion}
                    token={accessToken}
                  />
                  {selectedQuestions.length > 0 && (
                    <Typography variant="caption" color="primary.main" fontWeight={700} mt={1} display="block">
                      {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* ── Access & Participants ── */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>Access & Participants</Typography>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Who can join?</InputLabel>
                <Select value={participation} label="Who can join?" onChange={(e) => setParticipation(e.target.value as any)}>
                  <MenuItem value="public">Public — anyone can join</MenuItem>
                  <MenuItem value="invite_only">Invite Only — only invited users</MenuItem>
                  <MenuItem value="private">Private — only you</MenuItem>
                </Select>
              </FormControl>

              <Divider sx={{ mb: 2 }} />

              <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                <People sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" fontWeight={600}>Invite Participants</Typography>
              </Stack>
              <ParticipantSearch
                selected={participants}
                onAdd={(u) => setParticipants((p) => [...p, u])}
                onRemove={(id) => setParticipants((p) => p.filter((u) => u._id !== id))}
                token={accessToken}
              />
            </CardContent>
          </Card>

          {/* ── Submit ── */}
          <Button
            variant="contained" size="large" fullWidth
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem' }}
          >
            {submitting ? 'Creating Quiz…' : 'Create Quiz'}
          </Button>

        </Stack>
      </Box>
    </Box>
  );
}
