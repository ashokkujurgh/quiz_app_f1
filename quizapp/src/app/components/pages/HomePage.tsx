import { useState } from 'react';
import {
  Box, Stack, Typography, Button, Chip, Card, CardContent,
  TextField, IconButton, Avatar,
} from '@mui/material';
import { Add, Image, EmojiEmotions } from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setActiveTopic } from '../../store/slices/postsSlice';
import { PostCard } from '../shared/PostCard';
import { PostSkeleton } from '../shared/LoadingSkeleton';
import { EmptyState } from '../shared/EmptyState';
import { Inbox } from '@mui/icons-material';
import type { QuizTopic } from '../../types';

const topics: QuizTopic[] = [
  'All', 'General Science', 'Electrical', 'History', 'Geography',
  'Mathematics', 'Physics', 'Chemistry', 'Technology',
];

export function HomePage() {
  const dispatch = useAppDispatch();
  const { posts, activeTopic } = useAppSelector((s) => s.posts);
  const { user } = useAppSelector((s) => s.auth);
  const [isLoading] = useState(false);

  const filtered = activeTopic === 'All' ? posts : posts.filter((p) => p.topic === activeTopic);

  return (
    <Box>
      {/* Create Post Card */}
      {user && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
              <Avatar src={user.avatar} sx={{ width: 40, height: 40 }} />
              <Box
                sx={{
                  flex: 1, bgcolor: 'action.hover',
                  borderRadius: 3, px: 2, py: 1.25,
                  cursor: 'pointer', color: 'text.secondary',
                  fontSize: '0.875rem',
                }}
              >
                What's on your mind, {user.name.split(' ')[0]}?
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button startIcon={<Image />} size="small" sx={{ color: 'text.secondary' }}>Photo</Button>
              <Button startIcon={<EmojiEmotions />} size="small" sx={{ color: 'text.secondary' }}>Feeling</Button>
              <Button startIcon={<Add />} variant="contained" size="small">Post</Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Topic Filters */}
      <Box sx={{ mb: 2, overflowX: 'auto', pb: 0.5 }}>
        <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
          {topics.map((t) => (
            <Chip
              key={t}
              label={t}
              clickable
              onClick={() => dispatch(setActiveTopic(t))}
              variant={activeTopic === t ? 'filled' : 'outlined'}
              color={activeTopic === t ? 'primary' : 'default'}
              sx={{ fontWeight: activeTopic === t ? 700 : 500 }}
            />
          ))}
        </Stack>
      </Box>

      {/* Feed */}
      {isLoading ? (
        <>
          <PostSkeleton />
          <PostSkeleton />
        </>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No posts found"
          description="Be the first to post in this topic!"
          actionLabel="Create Post"
          onAction={() => {}}
        />
      ) : (
        filtered.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </Box>
  );
}
