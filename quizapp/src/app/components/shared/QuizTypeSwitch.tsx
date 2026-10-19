import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Lightbulb, Engineering } from '@mui/icons-material';
import { useQuizType, type QuizType } from '../../utils/quizType';

/** GK / Engineering switch for game lists. The choice is shared across the page and remembered. */
export function QuizTypeSwitch({ fullWidth = false, size = 'small' }: { fullWidth?: boolean; size?: 'small' | 'medium' }) {
  const [type, setType] = useQuizType();
  return (
    <ToggleButtonGroup
      exclusive
      size={size}
      fullWidth={fullWidth}
      value={type}
      onChange={(_, v: QuizType | null) => v && setType(v)}
      aria-label="Game type"
      sx={{
        '& .MuiToggleButton-root': {
          textTransform: 'none', fontWeight: 700, gap: 0.75, px: 1.75, py: size === 'small' ? 0.4 : 0.75,
          borderRadius: 2, lineHeight: 1.4,
        },
        '& .MuiToggleButton-root.Mui-selected': {
          bgcolor: 'primary.main', color: 'primary.contrastText',
          '&:hover': { bgcolor: 'primary.dark' },
        },
      }}
    >
      <ToggleButton value="gk" aria-label="GK games">
        <Lightbulb sx={{ fontSize: 16 }} /> GK
      </ToggleButton>
      <ToggleButton value="engineering" aria-label="Engineering games">
        <Engineering sx={{ fontSize: 16 }} /> Engineering
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
