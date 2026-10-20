import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { PlayArrow } from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { useAppSelector } from '../../store/hooks';
import { loadTopicsWithSubtopics } from '../../utils/topicsCache';
import { QUIZ_TOPICS, findQuizTopic } from '../../data/quizTopics';
import { NotFoundPage } from '../shared/ErrorBoundary';

const API = import.meta.env.VITE_API_URL ?? '';
const SAMPLE_COUNT = 10;
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

interface SampleQuestion {
  _id: string;
  text: string;
  options: { text: string }[];
  correctOption: number;
  description?: string;
}

// Public, indexable landing page for one quiz subject: intro, what it covers,
// sample questions with answers, and a button into practice mode.
export function QuizTopicPage() {
  const { slug }        = useParams();
  const navigate        = useNavigate();
  const { accessToken } = useAppSelector((s) => s.auth);
  const topic           = findQuizTopic(slug);

  const [subTopicId, setSubTopicId] = useState<string | null>(null);
  const [questions, setQuestions]   = useState<SampleQuestion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [revealed, setRevealed]     = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!topic) return;
    let cancelled = false;
    setLoading(true);
    setQuestions([]);
    setRevealed({});
    loadTopicsWithSubtopics()
      .then(({ topics, subTopics }) => {
        const parent = topics.find((t) => t.name === topic.topicName);
        const sub    = subTopics.find((s) => s.name === topic.subTopicName && (!parent || s.topic === parent._id));
        if (!sub) return null;
        if (!cancelled) setSubTopicId(sub._id);
        const params = new URLSearchParams({ subTopic: sub._id, limit: String(SAMPLE_COUNT) });
        return fetch(`${API}/api/questions?${params}`).then((r) => r.json());
      })
      .then((d) => { if (!cancelled && d?.success) setQuestions(d.questions ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [topic]);

  if (!topic) return <NotFoundPage />;

  const startPractice = () => {
    if (!accessToken) { navigate('/login'); return; }
    if (!subTopicId) return;
    navigate('/practice', { state: { subTopicId, subTopicName: topic.name, count: 10 } });
  };

  return (
    <Box sx={{ maxWidth: 820, mx: 'auto', pb: 4 }}>
      <Helmet>
        <title>{`${topic.title} — Meenzo`}</title>
        <meta name="description" content={topic.description} />
        <link rel="canonical" href={`https://meenzo.com/quizzes/${topic.slug}`} />
      </Helmet>

      <Typography variant="h4" component="h1" fontWeight={800} mb={1}>{topic.heading}</Typography>
      {topic.intro.map((p) => (
        <Typography key={p} color="text.secondary" sx={{ lineHeight: 1.7, mb: 1.25 }}>{p}</Typography>
      ))}

      <Stack direction="row" flexWrap="wrap" gap={1} my={2}>
        {topic.covers.map((c) => <Chip key={c} label={c} size="small" variant="outlined" />)}
      </Stack>

      <Button variant="contained" startIcon={<PlayArrow />} onClick={startPractice}
        disabled={!!accessToken && !subTopicId} sx={{ mb: 3 }}>
        {accessToken ? 'Start practice quiz' : 'Log in to practise'}
      </Button>

      <Typography variant="h6" component="h2" fontWeight={700} mb={1.5}>Sample questions</Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
      ) : questions.length === 0 ? (
        <Typography color="text.secondary" mb={3}>New questions for this topic are being added — check back soon.</Typography>
      ) : (
        <Stack spacing={1.5} mb={3}>
          {questions.map((q, i) => {
            const open = revealed[q._id];
            return (
              <Card key={q._id}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Typography fontWeight={600} mb={1}>{i + 1}. {q.text}</Typography>
                  <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, mb: 1 }}>
                    {q.options.map((o, oi) => (
                      <Typography component="li" key={oi} variant="body2"
                        sx={{ py: 0.25, color: open && oi === q.correctOption ? 'success.main' : 'text.secondary', fontWeight: open && oi === q.correctOption ? 700 : 400 }}>
                        {OPTION_LABELS[oi]}. {o.text}
                      </Typography>
                    ))}
                  </Box>
                  {open ? (
                    <Typography variant="body2" sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.25, lineHeight: 1.6 }}>
                      <strong>Answer: {OPTION_LABELS[q.correctOption]}</strong>{q.description ? ` — ${q.description}` : ''}
                    </Typography>
                  ) : (
                    <Button size="small" onClick={() => setRevealed((r) => ({ ...r, [q._id]: true }))}>Show answer</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <Typography variant="h6" component="h2" fontWeight={700} mb={1.5}>More quiz topics</Typography>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {QUIZ_TOPICS.filter((t) => t.slug !== topic.slug).map((t) => (
          <Chip key={t.slug} label={t.name} component={RouterLink} to={`/quizzes/${t.slug}`} clickable color="primary" variant="outlined" />
        ))}
      </Stack>
    </Box>
  );
}
