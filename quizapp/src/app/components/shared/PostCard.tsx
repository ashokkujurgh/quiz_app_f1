import { useState, useEffect } from 'react';
import {
  Card, CardContent, CardActions, Box, Typography, IconButton,
  Button, Stack, Divider, Tooltip, Avatar, TextField, CircularProgress,
} from '@mui/material';
import {
  ThumbUpOutlined, ThumbUp, ChatBubbleOutline, MoreHoriz, EmojiEvents,
  SendOutlined,
} from '@mui/icons-material';
import type { Post } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleLike, syncLike, incrementComments } from '../../store/slices/postsSlice';
import { UserAvatar } from './UserAvatar';
import { TopicChip } from './TopicChip';
import { formatDistanceToNow } from 'date-fns';

interface ApiComment {
  _id: string;
  author: { name: string; username: string; avatar?: string };
  content: string;
  createdAt: string;
  likes: number;
}

interface Props {
  post: Post;
}

const API = import.meta.env.VITE_API_URL ?? '';

export function PostCard({ post }: Props) {
  const dispatch = useAppDispatch();
  const { user, accessToken } = useAppSelector((s) => s.auth);

  const timeAgo = formatDistanceToNow(new Date(post.timestamp), { addSuffix: true });

  // ── Like ──────────────────────────────────────────────────────────────────────
  const handleLike = async () => {
    dispatch(toggleLike(post.id));
    try {
      const res = await fetch(`${API}/api/posts/${post.id}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        dispatch(syncLike({ id: post.id, liked: data.liked, likes: data.likes }));
      } else {
        dispatch(toggleLike(post.id));
      }
    } catch {
      dispatch(toggleLike(post.id));
    }
  };

  // ── Comments ──────────────────────────────────────────────────────────────────
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments]         = useState<ApiComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => {
    if (!showComments || commentsLoaded) return;
    setCommentsLoading(true);
    fetch(`${API}/api/posts/${post.id}/comments`, {
      credentials: 'include',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setComments(d.comments); })
      .catch(() => {})
      .finally(() => { setCommentsLoading(false); setCommentsLoaded(true); });
  }, [showComments]);

  const handleAddComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/posts/${post.id}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          content: commentText.trim(),
          authorName: user?.name,
          authorUsername: user?.username ?? user?.email?.split('@')[0] ?? 'user',
          authorAvatar: user?.avatar,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setComments((prev) => [...prev, data.comment as ApiComment]);
        dispatch(incrementComments(post.id));
        setCommentText('');
      }
    } catch {
      // silent — user can retry
    } finally {
      setSubmitting(false);
    }
  };

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
              mt: 1.5, p: 2, borderRadius: 2,
              background: 'linear-gradient(135deg, #5563DE18 0%, #E91E8C12 100%)',
              border: '1px solid', borderColor: 'primary.main', borderOpacity: 0.2,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <EmojiEvents sx={{ color: 'warning.main', fontSize: 20 }} />
              <Typography variant="caption" fontWeight={700} color="primary.main">Quiz Result</Typography>
            </Stack>
            <Typography variant="subtitle2" fontWeight={700}>{post.quizResult.quizTitle}</Typography>
            <Stack direction="row" spacing={3} mt={0.5}>
              <Box>
                <Typography variant="h5" fontWeight={800} color="primary.main">{post.quizResult.percentage}%</Typography>
                <Typography variant="caption" color="text.secondary">Score</Typography>
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800}>{post.quizResult.score}/{post.quizResult.total}</Typography>
                <Typography variant="caption" color="text.secondary">Correct</Typography>
              </Box>
              {post.quizResult.rank && (
                <Box>
                  <Typography variant="h5" fontWeight={800} color="warning.main">#{post.quizResult.rank}</Typography>
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
            {post.likes} likes · {post.comments} comments
          </Typography>
        </Stack>
        <Divider />
      </Box>

      <CardActions sx={{ px: 1, py: 0.5, justifyContent: 'flex-end' }}>
        <Tooltip title="Like">
          <Button
            startIcon={post.liked ? <ThumbUp color="primary" /> : <ThumbUpOutlined />}
            size="small"
            onClick={handleLike}
            sx={{ color: post.liked ? 'primary.main' : 'text.secondary' }}
          >
            Like
          </Button>
        </Tooltip>
        <Tooltip title="Comment">
          <Button
            startIcon={<ChatBubbleOutline />}
            size="small"
            onClick={() => setShowComments((v) => !v)}
            sx={{ color: showComments ? 'primary.main' : 'text.secondary' }}
          >
            Comment
          </Button>
        </Tooltip>
      </CardActions>

      {/* Comments section */}
      {showComments && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Divider sx={{ mb: 1.5 }} />

          {/* Existing comments */}
          {commentsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : comments.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              No comments yet. Be the first!
            </Typography>
          ) : (
            <Stack spacing={1.5} mb={2}>
              {comments.map((c) => (
                <Stack key={c._id} direction="row" spacing={1} alignItems="flex-start">
                  <Avatar
                    src={c.author.avatar}
                    sx={{ width: 32, height: 32, fontSize: 13 }}
                  >
                    {c.author.name?.[0]}
                  </Avatar>
                  <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, px: 1.5, py: 1, flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" fontWeight={700}>{c.author.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 0.25 }}>{c.content}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          )}

          {/* Add comment input */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar src={user?.avatar} sx={{ width: 32, height: 32, fontSize: 13 }}>
              {user?.name?.[0]}
            </Avatar>
            <TextField
              size="small"
              fullWidth
              multiline
              maxRows={4}
              placeholder="Write a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
              disabled={submitting}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
            <IconButton
              size="small"
              onClick={handleAddComment}
              disabled={!commentText.trim() || submitting}
              sx={{
                color: commentText.trim() && !submitting ? 'primary.main' : 'text.disabled',
                transition: 'color 0.2s',
              }}
            >
              {submitting ? <CircularProgress size={18} color="primary" /> : <SendOutlined fontSize="small" />}
            </IconButton>
          </Stack>
        </Box>
      )}
    </Card>
  );
}
