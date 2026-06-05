import { useNavigate } from 'react-router';
import {
  Box, Card, CardContent, Typography, Stack, Button, CircularProgress,
  Divider, Chip,
} from '@mui/material';
import {
  EmojiEvents, Replay, Share, Home, CheckCircle, Cancel,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { resetQuiz } from '../../store/slices/quizSlice';
import { TopicChip } from '../shared/TopicChip';

export function QuizResultPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { result, activeQuiz, answers } = useAppSelector((s) => s.quiz);

  if (!result) { navigate('/quizzes'); return null; }

  const pct = result.percentage;
  const grade =
    pct >= 90 ? { label: 'Excellent!', emoji: '🏆', color: '#f59e0b' } :
    pct >= 75 ? { label: 'Great Job!', emoji: '🎉', color: '#22c55e' } :
    pct >= 60 ? { label: 'Good Effort!', emoji: '👍', color: '#3b82f6' } :
    { label: 'Keep Practicing!', emoji: '📚', color: '#ef4444' };

  const mins = Math.floor(result.duration / 60);
  const secs = result.duration % 60;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      {/* Result Hero */}
      <Card
        sx={{
          mb: 3,
          background: `linear-gradient(135deg, ${grade.color}20 0%, ${grade.color}08 100%)`,
          border: `2px solid ${grade.color}40`,
          textAlign: 'center',
        }}
      >
        <CardContent sx={{ py: 4 }}>
          <Typography fontSize={56} mb={1}>{grade.emoji}</Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: grade.color, mb: 0.5 }}>
            {grade.label}
          </Typography>
          <Typography variant="h6" color="text.secondary" mb={3}>{result.quizTitle}</Typography>

          {/* Circular Progress Score */}
          <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
            <CircularProgress
              variant="determinate"
              value={pct}
              size={120}
              thickness={6}
              sx={{ color: grade.color }}
            />
            <Box
              sx={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Typography variant="h4" fontWeight={800}>{pct}%</Typography>
              <Typography variant="caption" color="text.secondary">Score</Typography>
            </Box>
          </Box>

          {/* Stats Row */}
          <Stack direction="row" justifyContent="center" spacing={4} flexWrap="wrap">
            <Box textAlign="center">
              <Typography variant="h5" fontWeight={800} color="success.main">
                {result.score}
              </Typography>
              <Typography variant="caption" color="text.secondary">Correct</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h5" fontWeight={800} color="error.main">
                {result.total - result.score}
              </Typography>
              <Typography variant="caption" color="text.secondary">Wrong</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h5" fontWeight={800} color="warning.main">
                #{result.rank}
              </Typography>
              <Typography variant="caption" color="text.secondary">Rank</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h5" fontWeight={800}>
                {mins}:{secs.toString().padStart(2, '0')}
              </Typography>
              <Typography variant="caption" color="text.secondary">Duration</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Answers Review */}
      {activeQuiz && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>Answer Review</Typography>
            <Stack spacing={1.5}>
              {activeQuiz.questions.map((q, idx) => {
                const userAns = answers[idx];
                const isCorrect = userAns === q.correctAnswer;
                return (
                  <Box key={q.id}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      {isCorrect ? (
                        <CheckCircle sx={{ color: 'success.main', fontSize: 20, mt: 0.25, flexShrink: 0 }} />
                      ) : (
                        <Cancel sx={{ color: 'error.main', fontSize: 20, mt: 0.25, flexShrink: 0 }} />
                      )}
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={600}>{q.question}</Typography>
                        <Typography variant="caption" color={isCorrect ? 'success.main' : 'error.main'}>
                          Your answer: {userAns >= 0 ? q.options[userAns] : 'Not answered'}
                        </Typography>
                        {!isCorrect && (
                          <Typography variant="caption" color="success.main" display="block">
                            Correct: {q.options[q.correctAnswer]}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                    {idx < activeQuiz.questions.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        <Button
          variant="outlined"
          startIcon={<Home />}
          onClick={() => { dispatch(resetQuiz()); navigate('/home'); }}
          sx={{ flex: 1 }}
        >
          Home
        </Button>
        <Button
          variant="outlined"
          startIcon={<Replay />}
          onClick={() => {
            if (activeQuiz) {
              dispatch(resetQuiz());
              navigate('/quizzes');
            }
          }}
          sx={{ flex: 1 }}
        >
          Try Again
        </Button>
        <Button variant="contained" startIcon={<Share />} sx={{ flex: 1 }}>
          Share Result
        </Button>
      </Stack>
    </Box>
  );
}
