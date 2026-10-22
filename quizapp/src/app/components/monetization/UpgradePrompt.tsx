import { Alert, AlertTitle, Button } from '@mui/material';
import { useNavigate } from 'react-router';

/** Explains why something is unavailable and links to the plans page. */
export function UpgradePrompt({ message, title, plan = 'premium', onClose }: { message: string; title?: string; plan?: 'premium' | 'creator'; onClose?: () => void }) {
  const navigate = useNavigate();
  return (
    <Alert
      severity="warning"
      onClose={onClose}
      action={<Button color="inherit" size="small" onClick={() => navigate(`/plans?highlight=${plan}`)}>See plans</Button>}
      sx={{ alignItems: 'center' }}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {message}
    </Alert>
  );
}
