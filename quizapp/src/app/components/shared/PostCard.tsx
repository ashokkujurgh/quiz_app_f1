import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Card, CardContent, CardActions, Box, Typography, IconButton,
  Button, Stack, Divider, Tooltip, Avatar, TextField, CircularProgress, Badge,
  Menu, MenuItem, ListItemIcon, ListItemText, Snackbar, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress,
} from '@mui/material';
import {
  ThumbUpOutlined, ThumbUp, ChatBubbleOutline, MoreHoriz, EmojiEvents,
  SendOutlined, Verified, Groups, Block, Timer, People,
} from '@mui/icons-material';
import type { Post, QuizResult, QuizTopic } from '../../types';

const MEDAL = ['🥇', '🥈', '🥉'];
const INITIAL_SHOW = 5;

function QuizResultCard({ result, isAdmin }: { result: QuizResult; isAdmin: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const durationMin = Math.round((result.duration ?? 0) / 60);
  const allPlayers  = result.topPlayers ?? [];
  const visiblePlayers = expanded ? allPlayers : allPlayers.slice(0, INITIAL_SHOW);
  const hasMore = allPlayers.length > INITIAL_SHOW;

  if (isAdmin) {
    return (
      <Box sx={{
        mt: 1.5, borderRadius: 2.5, overflow: 'hidden',
        border: '1px solid', borderColor: 'divider',
        background: (t) => t.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
          : 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      }}>
        {/* Header */}
        <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
            <EmojiEvents sx={{ color: '#FFD700', fontSize: 22 }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: '#FFD700', letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>
              Quiz Completed
            </Typography>
          </Stack>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: 'white', lineHeight: 1.3, mb: 1.5 }}>
            {result.quizTitle}
          </Typography>

          {/* Stats row */}
          <Stack direction="row" spacing={3}>
            {result.playerCount != null && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <People sx={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  {result.playerCount} players
                </Typography>
              </Stack>
            )}
            {durationMin > 0 && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Timer sx={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  {durationMin} min
                </Typography>
              </Stack>
            )}
            {result.avgPercentage != null && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                Avg {result.avgPercentage}%
              </Typography>
            )}
          </Stack>
        </Box>

        {/* Leaderboard */}
        {allPlayers.length > 0 && (
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 10, mb: 1, display: 'block' }}>
              Top Finishers
            </Typography>
            <Stack spacing={0.75}>
              {visiblePlayers.map((p, i) => (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  bgcolor: i === 0 ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.05)',
                  borderRadius: 2, px: 1.5, py: 0.85,
                  border: i === 0 ? '1px solid rgba(255,215,0,0.25)' : '1px solid rgba(255,255,255,0.06)',
                }}>
                  {i < 3
                    ? <Typography sx={{ fontSize: 16, lineHeight: 1, minWidth: 24, textAlign: 'center' }}>{MEDAL[i]}</Typography>
                    : <Typography variant="caption" fontWeight={700} sx={{ color: 'rgba(255,255,255,0.4)', minWidth: 24, textAlign: 'center' }}>#{p.rank}</Typography>
                  }
                  <Typography variant="body2" fontWeight={i < 3 ? 700 : 500} sx={{ color: i === 0 ? 'white' : 'rgba(255,255,255,0.8)', flex: 1 }} noWrap>
                    {p.name}
                  </Typography>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: i === 0 ? '#FFD700' : 'rgba(255,255,255,0.75)', display: 'block', lineHeight: 1.2 }}>
                      {p.percentage}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>
                      {p.score}/{p.total}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>

            {hasMore && (
              <Button
                size="small"
                onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                sx={{ mt: 1, color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, textTransform: 'none', '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.08)' } }}
              >
                {expanded ? 'Show less ▲' : `View all ${allPlayers.length} players ▼`}
              </Button>
            )}
          </Box>
        )}
      </Box>
    );
  }

  // Personal result card
  const pct = result.percentage;
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <Box sx={{
      mt: 1.5, borderRadius: 2.5, overflow: 'hidden',
      border: '1px solid', borderColor: 'divider',
      background: (t) => t.palette.mode === 'dark'
        ? 'linear-gradient(135deg, #1a1a2e 0%, #0d1b2a 100%)'
        : 'linear-gradient(135deg, #1e3a5f 0%, #0f2447 100%)',
    }}>
      <Stack direction="row" alignItems="center" px={2.5} pt={2} pb={1.5} spacing={2}>
        <Box sx={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
          <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={32} cy={32} r={26} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
            <circle cx={32} cy={32} r={26} fill="none" stroke={color} strokeWidth={5}
              strokeDasharray={2 * Math.PI * 26}
              strokeDashoffset={2 * Math.PI * 26 * (1 - pct / 100)}
              strokeLinecap="round" />
          </svg>
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 13, lineHeight: 1 }}>{pct}%</Typography>
          </Box>
        </Box>
        <Box flex={1} minWidth={0}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 10, fontWeight: 600 }}>
            Quiz Result
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'white', lineHeight: 1.3 }} noWrap>
            {result.quizTitle}
          </Typography>
          <Stack direction="row" spacing={2} mt={0.5}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{result.score}/{result.total} correct</Typography>
            {result.rank && <Typography variant="caption" sx={{ color: '#FFD700', fontWeight: 700 }}>#{result.rank} rank</Typography>}
          </Stack>
        </Box>
      </Stack>
      <LinearProgress variant="determinate" value={pct}
        sx={{ height: 3, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: color } }} />
    </Box>
  );
}
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleLike, syncLike, incrementComments } from '../../store/slices/postsSlice';
import { useOnlineUsers } from '../../context/OnlineUsersContext';
import { useBlockedUsers } from '../../hooks/useBlockedUsers';
import { UserAvatar } from './UserAvatar';
import { TopicChip } from './TopicChip';
import { formatDistanceToNow } from 'date-fns';

interface ApiComment {
  _id: string;
  author: { userId?: string; name: string; username: string; avatar?: string };
  content: string;
  createdAt: string;
  likes: number;
}

const onlineDotSx = (online: boolean) => ({
  '& .MuiBadge-badge': {
    backgroundColor: online ? '#44b700' : 'transparent',
    boxShadow: online ? '0 0 0 2px white' : 'none',
    width: 10, height: 10, borderRadius: '50%', minWidth: 'unset',
  },
});

interface Props {
  post: Post;
}

const API = import.meta.env.VITE_API_URL ?? '';

export function PostCard({ post }: Props) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, accessToken } = useAppSelector((s) => s.auth);
  const { isOnline } = useOnlineUsers();

  const timeAgo = formatDistanceToNow(new Date(post.timestamp), { addSuffix: true });

  // Normalise images: prefer images[] array, fall back to legacy image field
  const postImages: string[] = post.images?.length ? post.images : post.image ? [post.image] : [];

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
  const [commentError, setCommentError] = useState('');

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
    setCommentError('');
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
      } else {
        setCommentError(data.message ?? 'Failed to post comment.');
      }
    } catch {
      setCommentError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 3-dot menu ────────────────────────────────────────────────────────────────
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const { blockedIds, block } = useBlockedUsers();
  const blocked = blockedIds.includes(post.author.id);

  const handleBlock = () => {
    setBlockDialogOpen(false);
    setMenuAnchor(null);
    block(post.author.id, accessToken ?? '');
    setSnackMsg(`You blocked ${post.author.name}. Their posts won't appear.`);
  };

  const isOfficial = post.userType === 'admin' || post.author.role === 'admin';

  if (blocked) return (
    <Snackbar
      open={Boolean(snackMsg)}
      autoHideDuration={4000}
      onClose={() => setSnackMsg('')}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="info" onClose={() => setSnackMsg('')} sx={{ width: '100%' }}>
        {snackMsg}
      </Alert>
    </Snackbar>
  );

  return (
    <Card sx={{
      mb: 2,
      ...(isOfficial && {
        border: '1.5px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }),
    }}>
      {/* Label banner */}
      <Box sx={{
        px: 2, py: 0.6,
        display: 'flex', alignItems: 'center', gap: 0.75,
        bgcolor: isOfficial ? 'action.selected' : 'action.hover',
        borderBottom: '1px solid', borderColor: 'divider',
      }}>
        {isOfficial
          ? <Verified sx={{ fontSize: 13, color: 'text.secondary' }} />
          : <Groups sx={{ fontSize: 13, color: 'text.secondary' }} />}
        <Typography variant="caption" fontWeight={700} sx={{
          color: isOfficial ? 'text.secondary' : 'text.secondary',
          letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 10,
        }}>
          {isOfficial ? 'Official' : 'Community'}
        </Typography>
      </Box>

      <CardContent sx={{ pb: 1 }}>
        {/* Header */}
        <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={1.5}>
          <UserAvatar user={{ ...post.author, isOnline: isOnline(post.author.id) }} size={44} showOnline />
          <Box flex={1}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography variant="subtitle2" fontWeight={700}>
                {post.author.name}
              </Typography>
              {isOfficial && (
                <Verified sx={{ fontSize: 15, color: 'primary.main' }} />
              )}
              <Typography variant="caption" color="text.secondary">@{post.author.username}</Typography>
              <TopicChip topic={(post.subTopic ?? post.topic) as QuizTopic} />
            </Stack>
            <Typography variant="caption" color="text.secondary">{timeAgo}</Typography>
          </Box>
          <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreHoriz fontSize="small" />
          </IconButton>
        </Stack>

        {/* Content — 3-line clamp, click to open detail */}
        {!(isOfficial && post.quizResult) && (
          <Box onClick={() => navigate(`/posts/${post.slug ?? post.id}`)} sx={{ cursor: 'pointer' }}>
            {post.title && (
              <Typography variant="subtitle2" fontWeight={700} mb={0.5}>
                {post.title}
              </Typography>
            )}
            <Typography
              variant="body2"
              sx={{
                lineHeight: 1.7,
                whiteSpace: 'pre-line',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                mb: 0.5,
              }}
            >
              {post.content}
            </Typography>
            <Typography
              variant="caption"
              color="primary.main"
              sx={{ fontWeight: 600, '&:hover': { textDecoration: 'underline' }, mb: postImages.length ? 1 : 0, display: 'block' }}
            >
              Read more
            </Typography>
          </Box>
        )}

        {/* Images */}
        {postImages.length === 1 && (
          <Box component="img" src={postImages[0]} alt="post"
            sx={{ width: '100%', borderRadius: 2, maxHeight: 320, objectFit: 'cover', display: 'block' }} />
        )}
        {postImages.length === 2 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, borderRadius: 2, overflow: 'hidden' }}>
            {postImages.map((src, i) => (
              <Box key={i} component="img" src={src} alt={`post-${i}`}
                sx={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
            ))}
          </Box>
        )}
        {postImages.length >= 3 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, borderRadius: 2, overflow: 'hidden' }}>
            <Box component="img" src={postImages[0]} alt="post-0"
              sx={{ width: '100%', height: 240, objectFit: 'cover', display: 'block', gridRow: '1 / 3' }} />
            {postImages.slice(1, 3).map((src, i) => (
              <Box key={i} component="img" src={src} alt={`post-${i + 1}`}
                sx={{ width: '100%', height: 118, objectFit: 'cover', display: 'block' }} />
            ))}
            {postImages.length > 3 && (
              <Box sx={{ position: 'relative' }}>
                <Box component="img" src={postImages[3]} alt="post-3"
                  sx={{ width: '100%', height: 118, objectFit: 'cover', display: 'block' }} />
                {postImages.length > 4 && (
                  <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h6" color="white" fontWeight={700}>+{postImages.length - 4}</Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* AI Image badge */}
        {post.isAiImage && postImages.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Box component="span" sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 1, py: 0.25, borderRadius: 1,
              bgcolor: 'rgba(147,51,234,0.12)',
              color: 'rgb(147,51,234)',
              fontSize: '0.7rem', fontWeight: 600,
            }}>
              ✦ AI Generated Image
            </Box>
          </Box>
        )}

        {/* Quiz Result Card */}
        {post.quizResult && <QuizResultCard result={post.quizResult} isAdmin={post.userType === 'admin'} />}
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

      {/* 3-dot menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
      </Menu>

      {/* Block confirm dialog */}
      <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Block {post.author.name}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            You won't see posts or comments from <strong>{post.author.name}</strong> anymore.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleBlock}>Block</Button>
        </DialogActions>
      </Dialog>

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
                  <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot" sx={onlineDotSx(isOnline(c.author.userId ?? ''))}>
                    <Avatar
                      src={c.author.avatar}
                      sx={{ width: 32, height: 32, fontSize: 13 }}
                    >
                      {c.author.name?.[0]}
                    </Avatar>
                  </Badge>
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

          {/* AI filter error */}
          {commentError && (
            <Alert
              severity="error"
              onClose={() => setCommentError('')}
              sx={{ mb: 1.5, py: 0.5, fontSize: '0.8rem', borderRadius: 2 }}
            >
              {commentError}
            </Alert>
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
