import { Badge } from '@mui/material';
import type { ReactNode } from 'react';
import { useIsOnline } from '../../context/OnlineUsersContext';

export const onlineDotSx = (online: boolean) => ({
  '& .MuiBadge-badge': {
    backgroundColor: online ? '#44b700' : 'transparent',
    boxShadow: online ? '0 0 0 2px white' : 'none',
    width: 10, height: 10, borderRadius: '50%', minWidth: 'unset',
  },
});

/**
 * Green online dot on an avatar, for lists (e.g. comments). Each badge subscribes
 * to its own user, so a status change re-renders just that badge, not the list.
 */
export function OnlineBadge({ userId, children }: { userId: string | null | undefined; children: ReactNode }) {
  const online = useIsOnline(userId);
  return (
    <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot" sx={onlineDotSx(online)}>
      {children}
    </Badge>
  );
}
