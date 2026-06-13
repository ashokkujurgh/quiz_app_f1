import { useState, useRef, useEffect } from 'react';
import {
  Box, Stack, Button, Chip, Card, CardContent,
  Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, CircularProgress, Alert, Typography,
} from '@mui/material';
import { Add, Image, EmojiEmotions, Close } from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setActiveTopic, addPost } from '../../store/slices/postsSlice';
import { PostCard } from '../shared/PostCard';
import { PostSkeleton } from '../shared/LoadingSkeleton';
import { EmptyState } from '../shared/EmptyState';
import { Inbox } from '@mui/icons-material';
import type { Post, QuizTopic } from '../../types';

const API = import.meta.env.VITE_API_URL ?? '';

interface ApiTopic { _id: string; name: string; }
interface ApiSubTopic { _id: string; name: string; topic: string; }

const filterTopics: QuizTopic[] = [
  'All', 'General Science', 'Electrical', 'History', 'Geography',
  'Mathematics', 'Physics', 'Chemistry', 'Technology',
];

export function HomePage() {
  const dispatch = useAppDispatch();
  const { posts, activeTopic } = useAppSelector((s) => s.posts);
  const { user, accessToken } = useAppSelector((s) => s.auth);
  const displayName = user?.name?.split(' ')[0] ?? 'there';
  const [isLoading] = useState(false);

  const filtered = activeTopic === 'All' ? posts : posts.filter((p) => p.topic === activeTopic);

  // all subtopics flattened from all topics
  const [allSubTopics, setAllSubTopics] = useState<ApiSubTopic[]>([]);
  const [selectedSubTopicId, setSelectedSubTopicId] = useState('');

  useEffect(() => {
    fetch(`${API}/api/topics`)
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.success || !d.topics?.length) return;
        const results = await Promise.all(
          (d.topics as ApiTopic[]).map((t) =>
            fetch(`${API}/api/topics/${t._id}/subtopics`)
              .then((r) => r.json())
              .then((sd) => (sd.subtopics ?? []) as ApiSubTopic[])
              .catch(() => [] as ApiSubTopic[])
          )
        );
        setAllSubTopics(results.flat());
      })
      .catch(() => {});
  }, []);

  // dialog state
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const openDialog = () => {
    setContent('');
    setImageFile(null); setImagePreview('');
    setError(''); setOpen(true);
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => { setImageFile(null); setImagePreview(''); };

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

      const res = await fetch(`${API}/api/posts`, {
        method: 'POST', credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          content: content.trim(),
          topic: allSubTopics.find((s) => s._id === selectedSubTopicId)?.name ?? 'General',
          ...(selectedSubTopicId ? { subTopic: allSubTopics.find((s) => s._id === selectedSubTopicId)?.name } : {}),
          ...(imageUrl ? { image: imageUrl } : {}),
          authorName: user?.name, authorAvatar: user?.avatar,
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
      {/* Create Post Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
            <Avatar src={user?.avatar} sx={{ width: 40, height: 40 }}>
              {user?.name?.[0]}
            </Avatar>
            <Box
              onClick={openDialog}
              sx={{
                flex: 1, bgcolor: 'action.hover', borderRadius: 3,
                px: 2, py: 1.25, cursor: 'pointer', color: 'text.secondary',
                fontSize: '0.875rem', '&:hover': { bgcolor: 'action.selected' },
              }}
            >
              What's on your mind, {displayName}?
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
          
            <Button startIcon={<Add />} variant="contained" size="small" onClick={openDialog}>Post</Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Topic Filters */}
      <Box sx={{ mb: 2, overflowX: 'auto', pb: 0.5 }}>
        <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
          {filterTopics.map((t) => (
            <Chip key={t} label={t} clickable
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
        <><PostSkeleton /><PostSkeleton /></>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="No posts found"
          description="Be the first to post in this topic!"
          actionLabel="Create Post" onAction={openDialog} />
      ) : (
        filtered.map((post) => <PostCard key={post.id} post={post} />)
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
              <TextField select size="small" value={selectedSubTopicId}
                onChange={(e) => setSelectedSubTopicId(e.target.value)}
                label=" Topic (optional)" sx={{ mt: 0.5, minWidth: 200 }}
                disabled={allSubTopics.length === 0}>
                <MenuItem value=""><em>None</em></MenuItem>
                {allSubTopics.map((s) => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
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
              <IconButton size="small" onClick={removeImage}
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
            disabled={submitting || !content.trim()}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}>
            {submitting ? 'Posting…' : 'Post'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
