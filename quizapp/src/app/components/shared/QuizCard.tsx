import {
  Card, CardContent, CardActionArea, Box, Typography,
  Stack, Chip, LinearProgress,
} from '@mui/material';
import { Timer, StarRate, PlayArrow } from '@mui/icons-material';
import type { Quiz } from '../../types';
import { TopicChip, topicColors } from './TopicChip';

const difficultyColor = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'error',
} as const;

interface Props {
  quiz: Quiz;
  onClick: () => void;
}

export function QuizCard({ quiz, onClick }: Props) {
  const accent = topicColors[quiz.category] ?? '#6366f1';
  const mins = Math.floor(quiz.duration / 60);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={onClick} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        {/* Color header */}
        <Box
          sx={{
            height: 100,
            background: `linear-gradient(135deg, ${accent}40 0%, ${accent}20 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Typography sx={{ fontSize: 52 }}>
            {quiz.category === 'General Science' ? '🔬'
              : quiz.category === 'Physics' ? '⚛️'
              : quiz.category === 'Chemistry' ? '🧪'
              : quiz.category === 'Mathematics' ? '📐'
              : quiz.category === 'History' ? '🏛️'
              : quiz.category === 'Geography' ? '🌍'
              : quiz.category === 'Electrical' ? '⚡'
              : '💻'}
          </Typography>
          <Box
            sx={{
              position: 'absolute',
              top: 8, right: 8,
              bgcolor: 'background.paper',
              borderRadius: 2,
              px: 1, py: 0.25,
              display: 'flex', alignItems: 'center', gap: 0.25,
            }}
          >
            <StarRate sx={{ fontSize: 14, color: 'warning.main' }} />
            <Typography variant="caption" fontWeight={700}>{quiz.rating}</Typography>
          </Box>
        </Box>

        <CardContent sx={{ flex: 1 }}>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <TopicChip topic={quiz.category} />
              <Chip
                label={quiz.difficulty}
                size="small"
                color={difficultyColor[quiz.difficulty]}
                sx={{ fontSize: '0.65rem', height: 20 }}
              />
            </Stack>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {quiz.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {quiz.description}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Timer sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">{mins} min</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <PlayArrow sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">{quiz.plays.toLocaleString()} plays</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">{quiz.questions.length} Qs</Typography>
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
