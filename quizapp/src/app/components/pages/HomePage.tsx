import { useState, useRef, useEffect } from 'react';
import {
  Box, Stack, Button, Chip, Card, CardContent,
  Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, CircularProgress, Alert, Typography, Skeleton,
} from '@mui/material';
import { Add, Image, Close, Login, PersonAdd, EditNote } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setActiveTopic, addPost, setPosts, setLoading } from '../../store/slices/postsSlice';
import { useOnlineUsers } from '../../context/OnlineUsersContext';
import { PostCard } from '../shared/PostCard';
import { PostSkeleton } from '../shared/LoadingSkeleton';
import { EmptyState } from '../shared/EmptyState';
import { Inbox } from '@mui/icons-material';
import type { Post, QuizTopic } from '../../types';

const API = import.meta.env.VITE_API_URL ?? '';

interface ApiTopic { _id: string; name: string; }
interface ApiSubTopic { _id: string; name: string; topic: string; }

export function HomePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { posts, activeTopic, loading: isLoading } = useAppSelector((s) => s.posts);
  const { user, accessToken } = useAppSelector((s) => s.auth);
  const { isOnline } = useOnlineUsers();
  const isGuest = !accessToken;
  const displayName = user?.name?.split(' ')[0] ?? 'there';

  // ── Topics & subtopics from API ───────────────────────────────────────────────
  const [topics, setTopics]             = useState<ApiTopic[]>([]);
  const [allSubTopics, setAllSubTopics] = useState<ApiSubTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [activeSubTopicId, setActiveSubTopicId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/topics`)
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.success || !d.topics?.length) return;
        const active = (d.topics as ApiTopic[]).filter((t: ApiTopic & { isActive?: boolean }) => t.isActive !== false);
        setTopics(active);
        const results = await Promise.all(
          active.map((t) =>
            fetch(`${API}/api/topics/${t._id}/subtopics`)
              .then((r) => r.json())
              .then((sd) => ((sd.subtopics ?? []) as (ApiSubTopic & { isActive?: boolean })[]).filter((s) => s.isActive !== false))
              .catch(() => [] as ApiSubTopic[])
          )
        );
        setAllSubTopics(results.flat());
      })
      .catch(() => {})
      .finally(() => setTopicsLoading(false));
  }, []);

  // ── Posts from API ────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(setLoading(true));
    const params = new URLSearchParams({ page: '1', limit: '20' });
    const activeSub = allSubTopics.find((s) => s._id === activeSubTopicId);
    if (activeSub) params.set('subTopic', activeSub.name);
    fetch(`${API}/api/posts?${params}`, {
      credentials: 'include',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const mapped = (d.posts as Record<string, unknown>[]).map((p) => {
          const author = (p['author'] as Record<string, unknown>) ?? {};
          return {
            id: (p['_id'] ?? p['id']) as string,
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
            timestamp: (p['createdAt'] ?? new Date().toISOString()) as string,
            likes: (p['likes'] as number) ?? 0,
            comments: (p['commentsCount'] as number) ?? 0,
            shares: (p['shares'] as number) ?? 0,
            liked: (p['liked'] as boolean) ?? false,
            saved: (p['saved'] as boolean) ?? false,
          };
        });
        dispatch(setPosts(mapped));
      })
      .catch(() => {})
      .finally(() => dispatch(setLoading(false)));
  }, [activeSubTopicId, allSubTopics, accessToken]);

  // ── Create post dialog ────────────────────────────────────────────────────────
  const [open, setOpen]               = useState(false);
  const [content, setContent]         = useState('');
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [selectedSubTopicId, setSelectedSubTopicId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const openDialog = () => {
    setContent(''); setImageFile(null); setImagePreview(''); setError(''); setOpen(true);
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!content.trim()) { setError('Please write something.'); return; }
    setSubmitting(true); setError('');
    try {
      let imageUrl = '';
      if (imageFile) {
        const form = new FormData();
        form.append('image', imageFile);
        const r = await fetch(`${API}/api/auth/upload/image`, {
          method: 'POST', credentials: 'include',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          body: form,
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message ?? 'Image upload failed');
        imageUrl = d.url as string;
      }

      const selectedSub = allSubTopics.find((s) => s._id === selectedSubTopicId);
      const parentTopic = selectedSub
        ? topics.find((t) => t._id === selectedSub.topic)?.name ?? selectedSub.name
        : 'General';

      const res = await fetch(`${API}/api/posts`, {
        method: 'POST', credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          content: content.trim(),
          topic: parentTopic,
          ...(selectedSub ? { subTopic: selectedSub.name } : {}),
          ...(imageUrl ? { image: imageUrl } : {}),
          authorName: user?.name,
          authorUsername: user?.username ?? user?.email?.split('@')[0] ?? 'user',
          authorAvatar: user?.avatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create post');

      const p = data.post as Record<string, unknown>;
      const author = (p['author'] as Record<string, unknown>) ?? {};
      const newPost: Post = {
        id: (p['_id'] ?? p['id']) as string,
        author: {
          id: (author['_id'] ?? author['id'] ?? user?.id ?? '') as string,
          name: (author['name'] ?? user?.name ?? '') as string,
          username: (author['username'] ?? user?.username ?? '') as string,
          email: (author['email'] ?? user?.email ?? '') as string,
          avatar: (author['avatar'] ?? user?.avatar) as string | undefined,
          isOnline: true,
          role: 'user',
          stats: { friends: 0, posts: 0, quizzesTaken: 0, averageScore: 0 },
          joinedAt: new Date().toISOString(),
        },
        content: p['content'] as string,
        image: p['image'] as string | undefined,
        topic: p['topic'] as QuizTopic,
        timestamp: (p['createdAt'] ?? new Date().toISOString()) as string,
        likes: 0, comments: 0, shares: 0, liked: false, saved: false,
      };
      dispatch(addPost(newPost));
      setOpen(false);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {/* Create Post / Guest Banner */}
      {isGuest ? (
        <Card sx={{
          mb: 2, overflow: 'hidden',
          background: (t) => t.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
            : 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
          border: '1px solid', borderColor: 'primary.main', borderOpacity: 0.3,
        }}>
          <CardContent sx={{ py: 3 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Welcome to Meenzo 👋
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2.5}>
              Join the community — share posts, take quizzes, and compete on the leaderboard.
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" startIcon={<Login />} onClick={() => navigate('/login')} size="small">
                Sign In
              </Button>
              <Button variant="outlined" startIcon={<PersonAdd />} onClick={() => navigate('/signup')} size="small">
                Create Account
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ pb: '12px !important' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ position: 'relative', flexShrink: 0 }}>
                <Avatar src={user?.avatar} sx={{ width: 42, height: 42, bgcolor: 'primary.main' }}>
                  {user?.name?.[0]}
                </Avatar>
                <Box sx={{
                  position: 'absolute', bottom: 1, right: 1,
                  width: 10, height: 10, borderRadius: '50%',
                  bgcolor: isOnline(user?.id ?? '') ? '#44b700' : 'text.disabled',
                  border: '2px solid', borderColor: 'background.paper',
                }} />
              </Box>
              <Box
                onClick={openDialog}
                sx={{
                  flex: 1, bgcolor: 'action.hover', borderRadius: 3,
                  px: 2, py: 1.4, cursor: 'pointer', color: 'text.secondary',
                  fontSize: '0.875rem',
                  border: '1px solid transparent',
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: 'action.selected', borderColor: 'divider' },
                }}
              >
                What's on your mind, {displayName}?
              </Box>
              <Button
                startIcon={<EditNote />}
                variant="contained"
                size="small"
                onClick={openDialog}
                sx={{ flexShrink: 0, borderRadius: 2 }}
              >
                Post
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Subtopic filter chips */}
      <Box sx={{ mb: 2, overflowX: 'auto', pb: 0.5 }}>
        <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
          {topicsLoading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="rounded" width={80} height={32} sx={{ borderRadius: 4 }} />
            ))
          ) : (
            <>
              <Chip
                label="All"
                clickable
                onClick={() => setActiveSubTopicId(null)}
                variant={activeSubTopicId === null ? 'filled' : 'outlined'}
                color={activeSubTopicId === null ? 'primary' : 'default'}
                sx={{ fontWeight: activeSubTopicId === null ? 700 : 500 }}
              />
              {allSubTopics.map((s) => (
                <Chip
                  key={s._id}
                  label={s.name}
                  clickable
                  onClick={() => setActiveSubTopicId(activeSubTopicId === s._id ? null : s._id)}
                  variant={activeSubTopicId === s._id ? 'filled' : 'outlined'}
                  color={activeSubTopicId === s._id ? 'primary' : 'default'}
                  sx={{ fontWeight: activeSubTopicId === s._id ? 700 : 500 }}
                />
              ))}
            </>
          )}
        </Stack>
      </Box>

      {/* Feed */}
      {isLoading ? (
        <><PostSkeleton /><PostSkeleton /></>
      ) : posts.length === 0 ? (
        <EmptyState icon={Inbox} title="No posts found"
          description="Be the first to post in this topic!"
          actionLabel="Create Post" onAction={openDialog} />
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}

      {/* Create Post Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography fontWeight={700}>Create Post</Typography>
            <IconButton size="small" onClick={() => setOpen(false)}><Close /></IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={2}>
            <Avatar src={user?.avatar} sx={{ width: 40, height: 40, mt: 0.5 }}>
              {user?.name?.[0]}
            </Avatar>
            <Box flex={1}>
              <Typography fontWeight={700} variant="subtitle2">{user?.name}</Typography>
              <TextField
                select size="small" value={selectedSubTopicId}
                onChange={(e) => setSelectedSubTopicId(e.target.value)}
                label="Topic (optional)" sx={{ mt: 0.5, minWidth: 200 }}
                disabled={allSubTopics.length === 0}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {topics.map((t) => {
                  const subs = allSubTopics.filter((s) => s.topic === t._id);
                  if (subs.length === 0) return null;
                  return [
                    <MenuItem key={`topic-${t._id}`} disabled sx={{ fontWeight: 700, opacity: 0.6, fontSize: '0.75rem' }}>
                      {t.name}
                    </MenuItem>,
                    ...subs.map((s) => (
                      <MenuItem key={s._id} value={s._id} sx={{ pl: 3 }}>{s.name}</MenuItem>
                    )),
                  ];
                })}
              </TextField>
            </Box>
          </Stack>

          <TextField multiline rows={4} fullWidth
            placeholder={`What's on your mind, ${displayName}?`}
            value={content} onChange={(e) => setContent(e.target.value)}
            sx={{ mb: 2 }} />

          {imagePreview && (
            <Box sx={{ position: 'relative', mb: 2 }}>
              <Box component="img" src={imagePreview}
                sx={{ width: '100%', borderRadius: 2, maxHeight: 240, objectFit: 'cover' }} />
              <IconButton size="small" onClick={() => { setImageFile(null); setImagePreview(''); }}
                sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
          )}

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImagePick} />
          <Button startIcon={<Image />} variant="outlined" size="small"
            onClick={() => fileRef.current?.click()}>
            Add Photo
          </Button>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}
            sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,0.6)' } }}
            disabled={submitting || !content.trim()}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}>
            {submitting ? 'Posting…' : 'Post'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
