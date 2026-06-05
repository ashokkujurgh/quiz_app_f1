import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Box, Card, CardContent, Typography, Stack, Button,
  Chip, IconButton,
} from '@mui/material';
import { Timer, ArrowBack, ArrowForward, Check } from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  answerQuestion, nextQuestion, prevQuestion, tickTimer, completeQuiz, resetQuiz,
} from '../../store/slices/quizSlice';
import { TopicChip } from '../shared/TopicChip';

export function QuizPlayPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { activeQuiz, currentQuestion, answers, timeLeft, quizCompleted } = useAppSelector((s) => s.quiz);

  useEffect(() => {
    if (!activeQuiz) { navigate('/quizzes'); return; }
  }, [activeQuiz]);

  useEffect(() => {
    if (!activeQuiz) return;
    const timer = setInterval(() => {
      dispatch(tickTimer());
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuiz]);

  useEffect(() => {
    if (timeLeft === 0 && activeQuiz) {
      dispatch(completeQuiz());
      navigate('/quiz/result');
    }
  }, [timeLeft]);

  useEffect(() => {
    if (quizCompleted) navigate('/quiz/result');
  }, [quizCompleted]);

  if (!activeQuiz) return null;

  const question = activeQuiz.questions[currentQuestion];
  const totalQ = activeQuiz.questions.length;
  const progress = ((currentQuestion + 1) / totalQ) * 100;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isLowTime = timeLeft < 30;
  const currentAnswer = answers[currentQuestion];

  const handleAnswer = (optionIndex: number) => {
    dispatch(answerQuestion({ questionIndex: currentQuestion, answer: optionIndex }));
  };

  const handleFinish = () => {
    dispatch(completeQuiz());
    navigate('/quiz/result');
  };

  const isLastQuestion = currentQuestion === totalQ - 1;

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton size="small" onClick={() => { dispatch(resetQuiz()); navigate('/quizzes'); }}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>{activeQuiz.title}</Typography>
            <TopicChip topic={activeQuiz.category} />
          </Box>
        </Stack>
        <Chip
          icon={<Timer sx={{ fontSize: 16 }} />}
          label={`${mins}:${secs.toString().padStart(2, '0')}`}
          color={isLowTime ? 'error' : 'default'}
          sx={{
            fontWeight: 700,
            fontSize: '1rem',
            animation: isLowTime ? 'pulse 1s infinite' : 'none',
            '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
          }}
        />
      </Stack>

      {/* Progress */}
      <Box mb={2}>
        <Stack direction="row" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="text.secondary">Question {currentQuestion + 1} of {totalQ}</Typography>
          <Typography variant="caption" color="text.secondary">{answers.filter((a) => a !== -1).length} answered</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
      </Box>

      {/* Question Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.5, mb: 3 }}>
            {question.question}
          </Typography>
          <Stack spacing={1.5}>
            {question.options.map((option, idx) => {
              const isSelected = currentAnswer === idx;
              return (
                <Box
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'primary.main' : 'background.paper',
                    color: isSelected ? 'white' : 'text.primary',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 28, height: 28, borderRadius: '50%',
                      border: '2px solid',
                      borderColor: isSelected ? 'rgba(255,255,255,0.6)' : 'divider',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      bgcolor: isSelected ? 'rgba(255,255,255,0.2)' : 'transparent',
                    }}
                  >
                    {isSelected ? (
                      <Check sx={{ fontSize: 16 }} />
                    ) : (
                      <Typography variant="caption" fontWeight={700}>
                        {String.fromCharCode(65 + idx)}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                    {option}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      {/* Navigation */}
      <Stack direction="row" justifyContent="space-between">
        <Button
          startIcon={<ArrowBack />}
          disabled={currentQuestion === 0}
          onClick={() => dispatch(prevQuestion())}
          variant="outlined"
        >
          Previous
        </Button>

        {isLastQuestion ? (
          <Button
            variant="contained"
            color="success"
            onClick={handleFinish}
          >
            Submit Quiz
          </Button>
        ) : (
          <Button
            endIcon={<ArrowForward />}
            variant="contained"
            onClick={() => dispatch(nextQuestion())}
          >
            Next
          </Button>
        )}
      </Stack>

      {/* Question Navigator */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="caption" color="text.secondary" mb={1.5} display="block">
            Question Navigator
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {activeQuiz.questions.map((_, idx) => (
              <Box
                key={idx}
                sx={{
                  width: 32, height: 32,
                  borderRadius: 1.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  bgcolor: currentQuestion === idx
                    ? 'primary.main'
                    : answers[idx] !== -1
                    ? 'success.main'
                    : 'action.hover',
                  color: currentQuestion === idx || answers[idx] !== -1 ? 'white' : 'text.secondary',
                  '&:hover': { opacity: 0.8 },
                }}
              >
                {idx + 1}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
