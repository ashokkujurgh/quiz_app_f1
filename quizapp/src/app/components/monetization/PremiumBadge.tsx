import { Chip, type ChipProps } from '@mui/material';
import { WorkspacePremium } from '@mui/icons-material';

/** Marks a premium (creator) post. Purely informational — premium posts are free to read. */
export function PremiumBadge({ size = 'small', sx }: { size?: ChipProps['size']; sx?: ChipProps['sx'] }) {
  return (
    <Chip
      size={size}
      icon={<WorkspacePremium sx={{ fontSize: 16 }} />}
      label="Premium creator"
      aria-label="Premium creator post"
      sx={{ fontWeight: 700, bgcolor: 'rgba(245, 158, 11, 0.14)', color: '#B45309', '& .MuiChip-icon': { color: '#D97706' }, ...sx }}
    />
  );
}
