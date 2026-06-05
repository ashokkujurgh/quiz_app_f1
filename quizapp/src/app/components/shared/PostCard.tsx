import { useState } from 'react';
import {
  Card, CardContent, CardActions, Box, Typography, IconButton,
  Button, Stack, Divider, Tooltip, Avatar,
} from '@mui/material';
import {
  ThumbUpOutlined, ThumbUp, ChatBubbleOutline, ShareOutlined,
  BookmarkBorder, Bookmark, MoreHoriz, EmojiEvents,
} from '@mui/icons-material';
import type { Post } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import { toggleLike, toggleSave } from '../../store/slices/postsSlice';
import { UserAvatar } from './UserAvatar';
import { TopicChip } from './TopicChip';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  post: Post;
}

export function PostCard({ post }: Props) {
  const dispatch = useAppDispatch();
  const [expanded, setExpanded] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(post.timestamp), { addSuffix: true });

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ pb: 1 }}>
        {/* Header */}
        <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={1.5}>
          <UserAvatar user={post.author} size={44} showOnline />
          <Box flex={1}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography variant="subtitle2" fontWeight={700}>
                {post.author.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">@{post.author.username}</Typography>
              <TopicChip topic={post.topic} />
            </Stack>
            <Typography variant="caption" color="text.secondary">{timeAgo}</Typography>
          </Box>
          <IconButton size="small">
            <MoreHoriz fontSize="small" />
          </IconButton>
        </Stack>

        {/* Content */}
        <Typography variant="body2" sx={{ mb: post.image ? 1.5 : 0, lineHeight: 1.7 }}>
          {post.content}
        </Typography>

        {/* Image */}
        {post.image && (
          <Box
            component="img"
            src={post.image}
            alt="post"
            sx={{ width: '100%', borderRadius: 2, maxHeight: 320, objectFit: 'cover', display: 'block' }}
          />
        )}

        {/* Quiz Result Card */}
        {post.quizResult && (
          <Box
            sx={{
              mt: 1.5,
              p: 2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #5563DE18 0%, #E91E8C12 100%)',
              border: '1px solid',
              borderColor: 'primary.main',
              borderOpacity: 0.2,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <EmojiEvents sx={{ color: 'warning.main', fontSize: 20 }} />
              <Typography variant="caption" fontWeight={700} color="primary.main">
                Quiz Result
              </Typography>
            </Stack>
            <Typography variant="subtitle2" fontWeight={700}>{post.quizResult.quizTitle}</Typography>
            <Stack direction="row" spacing={3} mt={0.5}>
              <Box>
                <Typography variant="h5" fontWeight={800} color="primary.main">
                  {post.quizResult.percentage}%
                </Typography>
                <Typography variant="caption" color="text.secondary">Score</Typography>
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800}>
                  {post.quizResult.score}/{post.quizResult.total}
                </Typography>
                <Typography variant="caption" color="text.secondary">Correct</Typography>
              </Box>
              {post.quizResult.rank && (
                <Box>
                  <Typography variant="h5" fontWeight={800} color="warning.main">
                    #{post.quizResult.rank}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Rank</Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </CardContent>

      {/* Stats row */}
      <Box sx={{ px: 2 }}>
        <Stack direction="row" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="text.secondary">
            {post.likes} likes · {post.comments} comments · {post.shares} shares
          </Typography>
        </Stack>
        <Divider />
      </Box>

      <CardActions sx={{ px: 1, py: 0.5 }}>
        <Tooltip title="Like">
          <Button
            startIcon={post.liked ? <ThumbUp color="primary" /> : <ThumbUpOutlined />}
            size="small"
            onClick={() => dispatch(toggleLike(post.id))}
            sx={{ color: post.liked ? 'primary.main' : 'text.secondary', flex: 1 }}
          >
            Like
          </Button>
        </Tooltip>
        <Tooltip title="Comment">
          <Button
            startIcon={<ChatBubbleOutline />}
            size="small"
            sx={{ color: 'text.secondary', flex: 1 }}
          >
            Comment
          </Button>
        </Tooltip>
        <Tooltip title="Share">
          <Button
            startIcon={<ShareOutlined />}
            size="small"
            sx={{ color: 'text.secondary', flex: 1 }}
          >
            Share
          </Button>
        </Tooltip>
        <Tooltip title={post.saved ? 'Unsave' : 'Save'}>
          <IconButton size="small" onClick={() => dispatch(toggleSave(post.id))}>
            {post.saved ? <Bookmark color="primary" fontSize="small" /> : <BookmarkBorder fontSize="small" />}
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}
