import { Chip } from '@mui/material';
import type { QuizTopic } from '../../types';

const topicColors: Record<string, string> = {
  'General Science': '#3b82f6',
  'Electrical': '#f59e0b',
  'History': '#8b5cf6',
  'Geography': '#10b981',
  'Mathematics': '#ef4444',
  'Physics': '#06b6d4',
  'Chemistry': '#ec4899',
  'Technology': '#6366f1',
};

interface Props {
  topic: QuizTopic | string;
  size?: 'small' | 'medium';
}

export function TopicChip({ topic, size = 'small' }: Props) {
  const color = topicColors[topic] ?? '#6b7280';
  return (
    <Chip
      label={topic}
      size={size}
      sx={{
        bgcolor: `${color}18`,
        color,
        fontWeight: 600,
        border: `1px solid ${color}30`,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
      }}
    />
  );
}

export { topicColors };
