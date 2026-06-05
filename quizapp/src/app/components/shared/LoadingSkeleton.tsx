import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material';

export function PostSkeleton() {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Skeleton variant="circular" width={44} height={44} />
          <Box flex={1}>
            <Skeleton width="40%" height={20} />
            <Skeleton width="25%" height={16} />
          </Box>
        </Stack>
        <Skeleton width="100%" height={16} />
        <Skeleton width="90%" height={16} />
        <Skeleton width="70%" height={16} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 2, mb: 2 }} />
        <Stack direction="row" spacing={2}>
          <Skeleton width={60} height={32} />
          <Skeleton width={60} height={32} />
          <Skeleton width={60} height={32} />
        </Stack>
      </CardContent>
    </Card>
  );
}

export function FriendCardSkeleton() {
  return (
    <Card sx={{ mb: 1 }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Skeleton variant="circular" width={52} height={52} />
          <Box flex={1}>
            <Skeleton width="50%" height={20} />
            <Skeleton width="35%" height={16} />
          </Box>
          <Skeleton width={80} height={36} sx={{ borderRadius: 2 }} />
        </Stack>
      </CardContent>
    </Card>
  );
}

export function QuizCardSkeleton() {
  return (
    <Card>
      <Skeleton variant="rectangular" height={140} />
      <CardContent>
        <Skeleton width="70%" height={24} />
        <Skeleton width="40%" height={18} />
        <Skeleton width="100%" height={16} />
        <Skeleton width="85%" height={16} />
      </CardContent>
    </Card>
  );
}
