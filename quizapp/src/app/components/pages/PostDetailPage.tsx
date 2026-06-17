import { useLayoutEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Helmet } from 'react-helmet-async';
import {
  Box, Card, CardContent, Typography, Stack, Avatar, IconButton,
  Divider, CircularProgress, Badge, TextField, Button, Alert,
  useTheme, useMediaQuery,
} from '@mui/material';
import {
  ArrowBack, SendOutlined, ThumbUpOutlined, ThumbUp, ChatBubbleOutline,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { syncLike, toggleLike, incrementComments } from '../../store/slices/postsSlice';
import { useOnlineUsers } from '../../context/OnlineUsersContext';
import { Navbar } from '../layout/Navbar';
import { UserAvatar } from '../shared/UserAvatar';
import { TopicChip } from '../shared/TopicChip';
import type { Post, QuizTopic } from '../../types';

interface SeoMeta {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string | null;
  canonical: string | null;
}

interface PostWithSeo extends Post {
  seo?: SeoMeta | null;
}

const API = import.meta.env.VITE_API_URL ?? '';

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

function mapPost(p: Record<string, unknown>): PostWithSeo {
  const author = (p['author'] as Record<string, unknown>) ?? {};
  return {
    id: String(p['_id'] ?? p['id'] ?? ''),
    slug: (p['slug'] as string | null) ?? null,
    title: (p['title'] as string | null) ?? null,
    author: {
      id: String(author['userId'] ?? author['_id'] ?? ''),
      name: (author['name'] ?? '') as string,
      username: (author['username'] ?? '') as string,
      email: (author['email'] ?? '') as string,
      avatar: author['avatar'] as string | undefined,
      isOnline: false,
      role: 'user' as const,
      stats: { friends: 0, posts: 0, quizzesTaken: 0, averageScore: 0 },
      joinedAt: (p['createdAt'] ?? new Date().toISOString()) as string,
    },
    content: p['content'] as string,
    image: p['image'] as string | undefined,
    topic: (p['topic'] ?? 'General') as QuizTopic,
    subTopic: (p['subTopic'] as string | null) ?? null,
    userType: (p['userType'] as 'user' | 'admin') ?? 'user',
    timestamp: (p['createdAt'] ?? new Date().toISOString()) as string,
    likes: (p['likes'] as number) ?? 0,
    comments: (p['commentsCount'] as number) ?? 0,
    shares: 0,
    liked: (p['liked'] as boolean) ?? false,
    saved: false,
    seo: (p['seo'] as SeoMeta | null) ?? null,
  };
}

// ── Related post mini card ────────────────────────────────────────────────────
function RelatedPostCard({ post }: { post: Post }) {
  const navigate = useNavigate();
  return (
    <Card
      onClick={() => navigate(`/posts/${post.slug ?? post.id}`)}
      sx={{
        mb: 1.5, cursor: 'pointer',
        '&:hover': { boxShadow: 4 },
        transition: 'box-shadow 0.2s',
      }}
    >
      <CardContent sx={{ p: '12px !important' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <Avatar src={post.author.avatar} sx={{ width: 28, height: 28, fontSize: 11 }}>
            {post.author.name?.[0]}
          </Avatar>
          <Typography variant="caption" fontWeight={700} noWrap>{post.author.name}</Typography>
        </Stack>
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.8rem', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
        >
          {post.content}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" mt={1}>
          <TopicChip topic={(post.subTopic ?? post.topic) as QuizTopic} />
          <Typography variant="caption" color="text.secondary">
            {post.likes} likes
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Ad slot ───────────────────────────────────────────────────────────────────
function AdSlot({ width = '100%', height = 250, label = 'Advertisement' }: { width?: string | number; height?: number; label?: string }) {
  return (
    <div></div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function PostDetailPage() {
  const { slug: id } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, accessToken } = useAppSelector((s) => s.auth);
  const { isOnline } = useOnlineUsers();

  const [post, setPost] = useState<PostWithSeo | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [related, setRelated] = useState<PostWithSeo[]>([]);

  // Fetch main post
  useLayoutEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API}/api/posts/${id}`, {
      credentials: 'include',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setPost(mapPost(d.post)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, accessToken]);

  // Fetch comments
  useLayoutEffect(() => {
    if (!id) return;
    setCommentsLoading(true);
    fetch(`${API}/api/posts/${id}/comments`, {
      credentials: 'include',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setComments(d.comments); })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [id, accessToken]);

  // Fetch related posts (same topic, different id)
  useLayoutEffect(() => {
    if (!post) return;
    const params = new URLSearchParams({ limit: '6', subTopic: post.topic });
    fetch(`${API}/api/posts?${params}`, {
      credentials: 'include',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRelated(
            (d.posts as Record<string, unknown>[])
              .map(mapPost)
              .filter((p) => p.id !== post.id)
              .slice(0, 5)
          );
        }
      })
      .catch(() => {});
  }, [post?.topic, post?.id, accessToken]);

  const handleLike = async () => {
    if (!post || !accessToken) return;
    const optimistic = { liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 };
    setPost((p) => p ? { ...p, ...optimistic } : p);
    dispatch(toggleLike(post.id));
    try {
      const res = await fetch(`${API}/api/posts/${post.id}/like`, {
        method: 'POST', credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPost((p) => p ? { ...p, liked: data.liked, likes: data.likes } : p);
        dispatch(syncLike({ id: post.id, liked: data.liked, likes: data.likes }));
      } else {
        setPost((p) => p ? { ...p, liked: post.liked, likes: post.likes } : p);
        dispatch(toggleLike(post.id));
      }
    } catch {
      setPost((p) => p ? { ...p, liked: post.liked, likes: post.likes } : p);
      dispatch(toggleLike(post.id));
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || submitting || !accessToken || !post) return;
    setSubmitting(true);
    setCommentError('');
    try {
      const res = await fetch(`${API}/api/posts/${post.id}/comments`, {
        method: 'POST', credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
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
        setPost((p) => p ? { ...p, comments: p.comments + 1 } : p);
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

  // ── Post content (center column) ──────────────────────────────────────────
  const postContent = loading ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
  ) : !post ? (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography color="text.secondary">Post not found.</Typography>
      <Button onClick={() => navigate('/home')} sx={{ mt: 2 }}>Go Home</Button>
    </Box>
  ) : (
    <>
      {/* Post card */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={2}>
            <UserAvatar user={{ ...post.author, isOnline: isOnline(post.author.id) }} size={48} showOnline />
            <Box flex={1}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <Typography variant="subtitle2" fontWeight={700}>{post.author.name}</Typography>
                <Typography variant="caption" color="text.secondary">@{post.author.username}</Typography>
                <TopicChip topic={(post.subTopic ?? post.topic) as QuizTopic} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
              </Typography>
            </Box>
          </Stack>

          <Typography variant="body1" sx={{ lineHeight: 1.9, whiteSpace: 'pre-wrap', mb: post.image ? 2 : 0 }}>
            {post.content}
          </Typography>

          {post.image && (
            <Box component="img" src={post.image} alt="post"
              sx={{ width: '100%', borderRadius: 2, maxHeight: 480, objectFit: 'cover', display: 'block' }} />
          )}
        </CardContent>

        <Box sx={{ px: 2 }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">
              {post.likes} likes · {post.comments} comments
            </Typography>
          </Stack>
          <Divider />
        </Box>

        <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, py: 0.5 }}>
          <Button
            startIcon={post.liked ? <ThumbUp color="primary" /> : <ThumbUpOutlined />}
            size="small" onClick={handleLike} disabled={!accessToken}
            sx={{ color: post.liked ? 'primary.main' : 'text.secondary' }}
          >
            Like
          </Button>
          <Button startIcon={<ChatBubbleOutline />} size="small" sx={{ color: 'text.secondary' }}>
            Comment
          </Button>
        </Stack>
      </Card>

      {/* Comments */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} mb={2}>
            Comments ({post.comments})
          </Typography>

          {commentsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
          ) : comments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" mb={2}>No comments yet. Be the first!</Typography>
          ) : (
            <Stack spacing={2} mb={2}>
              {comments.map((c) => (
                <Stack key={c._id} direction="row" spacing={1.5} alignItems="flex-start">
                  <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot" sx={onlineDotSx(isOnline(c.author.userId ?? ''))}>
                    <Avatar src={c.author.avatar} sx={{ width: 36, height: 36, fontSize: 14 }}>
                      {c.author.name?.[0]}
                    </Avatar>
                  </Badge>
                  <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, px: 2, py: 1.25, flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Typography variant="caption" fontWeight={700}>{c.author.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </Typography>
                    </Stack>
                    <Typography variant="body2">{c.content}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          )}

          {commentError && (
            <Alert severity="error" onClose={() => setCommentError('')} sx={{ mb: 1.5, borderRadius: 2 }}>
              {commentError}
            </Alert>
          )}

          {accessToken ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar src={user?.avatar} sx={{ width: 36, height: 36, fontSize: 14 }}>
                {user?.name?.[0]}
              </Avatar>
              <TextField
                size="small" fullWidth multiline maxRows={4}
                placeholder="Write a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                disabled={submitting}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <IconButton size="small" onClick={handleAddComment}
                disabled={!commentText.trim() || submitting}
                sx={{ color: commentText.trim() && !submitting ? 'primary.main' : 'text.disabled', transition: 'color 0.2s' }}>
                {submitting ? <CircularProgress size={18} color="primary" /> : <SendOutlined fontSize="small" />}
              </IconButton>
            </Stack>
          ) : (
            <Button variant="outlined" fullWidth onClick={() => navigate('/login')} sx={{ borderRadius: 3 }}>
              Sign in to comment
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  );

  const [mobileOpen, setMobileOpen] = useState(false);

  const seo        = post?.seo;
  const pageTitle  = seo?.metaTitle  || post?.title  || `${post?.topic ?? 'Post'} — Meenzo`;
  const pageDesc   = seo?.metaDescription || post?.content?.slice(0, 155) || 'Read this post on Meenzo.';
  const ogTitle    = seo?.ogTitle    || pageTitle;
  const ogDesc     = seo?.ogDescription || pageDesc;
  const ogImage    = seo?.ogImage    || post?.image  || null;
  const keywords   = seo?.keywords?.join(', ') || `${post?.topic}, ${post?.author?.name}, meenzo`;
  const canonical  = seo?.canonical  || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description"        content={pageDesc} />
        <meta name="keywords"           content={keywords} />
        <meta name="robots"             content="index, follow" />
        {canonical && <link rel="canonical" href={canonical} />}

        {/* Open Graph */}
        <meta property="og:type"        content="article" />
        <meta property="og:title"       content={ogTitle} />
        <meta property="og:description" content={ogDesc} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        {canonical && <meta property="og:url" content={canonical} />}
        <meta property="og:site_name"   content="Meenzo" />

        {/* Twitter Card */}
        <meta name="twitter:card"        content={ogImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title"       content={ogTitle} />
        <meta name="twitter:description" content={ogDesc} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}

        {/* Article meta */}
        {post?.author?.name && <meta name="author" content={post.author.name} />}
        {post?.timestamp && <meta property="article:published_time" content={post.timestamp} />}
        {post?.topic && <meta property="article:section" content={post.topic} />}
        {seo?.keywords?.map((kw) => (
          <meta key={kw} property="article:tag" content={kw} />
        ))}
      </Helmet>

      <Navbar onMenuToggle={() => setMobileOpen(!mobileOpen)} />

      <Box sx={{
        flex: 1,
        display: 'flex',
        px: { xs: 2, md: 4, lg: 6 },
        pt: '80px',
        pb: 3,
        gap: 3,
      }}>

        {/* LEFT — Related posts */}
        {!isMobile && (
          <Box sx={{ width: 260, flexShrink: 0 }}>
            <Box sx={{ position: 'sticky', top: 88 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5} sx={{ px: 0.5 }}>
                Related Posts
              </Typography>
              {related.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                  No related posts yet.
                </Typography>
              ) : (
                related.map((p) => <RelatedPostCard key={p.id} post={p} />)
              )}
            </Box>
          </Box>
        )}

        {/* CENTER — Post detail */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {postContent}
        </Box>

        {/* RIGHT — Ad space */}
        {!isMobile && (
          <Box sx={{ width: 280, flexShrink: 0 }}>
            <Box sx={{ position: 'sticky', top: 88, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <AdSlot height={280} label="Advertisement" />
              <AdSlot height={200} label="Sponsored" />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
