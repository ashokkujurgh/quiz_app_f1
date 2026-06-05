import { Avatar, Badge, type AvatarProps } from '@mui/material';
import type { User } from '../../types';

interface Props extends Omit<AvatarProps, 'src' | 'alt'> {
  user: User;
  size?: number;
  showOnline?: boolean;
}

export function UserAvatar({ user, size = 40, showOnline = false, sx, ...rest }: Props) {
  const avatar = (
    <Avatar
      src={user.avatar}
      alt={user.name}
      sx={{ width: size, height: size, fontSize: size * 0.4, ...sx }}
      {...rest}
    >
      {user.name[0]}
    </Avatar>
  );

  if (!showOnline) return avatar;

  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      variant="dot"
      sx={{
        '& .MuiBadge-badge': {
          backgroundColor: user.isOnline ? '#44b700' : '#bdbdbd',
          color: user.isOnline ? '#44b700' : '#bdbdbd',
          boxShadow: '0 0 0 2px white',
          '&::after': {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            content: '""',
          },
        },
      }}
    >
      {avatar}
    </Badge>
  );
}
