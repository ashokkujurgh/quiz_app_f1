import { useState, useEffect, useRef } from 'react';
import {
  Box, Stack, Typography, Button, Avatar, Card, CardContent,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert, Chip, Skeleton,
  Menu, ListItemIcon, ListItemText, Snackbar,
} from '@mui/material';
import {
  Add, Image, Close, Edit, Delete, MoreHoriz, Article,
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { useNavigate } from 'react-router';
import { PostCard } from '../shared/PostCard';
import type { Post } from '../../types';

const API = import.meta.env.VITE_API_URL ?? '';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiTopic    { _id: string; name: string; isActive?: boolean }
interface ApiSubTopic { _id: string; name: string; topic: string; isActive?: boolean }

function mapPost(p: Record<string, unknown>): Post {
  const author = (p['author'] as Record<string, unknown>) ?? {};
  return {
    id:        String(p['_id'] ?? p['id'] ?? ''),
    slug:      (p['slug'] as string | null) ?? null,
    title:     (p['title'] as string | null) ?? null,
    author: {
      id:        String(author['userId'] ?? author['_id'] ?? ''),
      name:      String(author['name'] ?? ''),
      username:  String(author['username'] ?? ''),
      email:     '',
      avatar:    (author['avatar'] as string | undefined) ?? undefined,
      role:      'user',
      stats:     { friends: 0, posts: 0, quizzesTaken: 0, averageScore: 0 },
      joinedAt:  '',
    },
    content:   String(p['content'] ?? ''),
    image:     (p['image'] as string | undefined),
    images:    (p['images'] as string[]) ?? [],
    topic:     String(p['topic'] ?? '') as Post['topic'],
    subTopic:  (p['subTopic'] as string | null) ?? null,
    timestamp: String(p['createdAt'] ?? ''),
    likes:     Number(p['likes'] ?? 0),
    comments:  Number(p['commentsCount'] ?? 0),
    shares:    Number(p['shares'] ?? 0),
    saved:     Boolean(p['saved']),
    liked:     Boolean(p['liked']),
  };
}

// ── Post form (create / edit) ─────────────────────────────────────────────────

interface PostFormProps {
  open: boolean;
  editPost: Post | null;
  topics: ApiTopic[];
  accessToken: string;
  user: { name: string; username: string; avatar?: string };
  onClose: () => void;
  onSaved: (post: Post, isEdit: boolean) => void;
}

function PostForm({ open, editPost, topics, accessToken, user, onClose, onSaved }: PostFormProps) {
  const [content, setContent]           = useState('');
  const [title, setTitle]               = useState('');
  const [topicId, setTopicId]           = useState('');
  const [subTopicId, setSubTopicId]     = useState('');
  const [subTopics, setSubTopics]       = useState<ApiSubTopic[]>([]);
  const [subLoading, setSubLoading]     = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles]     = useState<File[]>([]);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // pre-fill when editing
  useEffect(() => {
    if (!open) return;
    if (editPost) {
      setTitle(editPost.title ?? '');
      setContent(editPost.content);
      setImagePreviews(editPost.images?.length ? editPost.images : editPost.image ? [editPost.image] : []);
      setImageFiles([]);
      setError('');
      // find topic by name
      const t = topics.find((x) => x.name.toLowerCase() === (editPost.topic as string).toLowerCase());
      setTopicId(t?._id ?? '');
    } else {
      setTitle(''); setContent(''); setTopicId(''); setSubTopicId('');
      setImagePreviews([]); setImageFiles([]); setError('');
    }
  }, [open, editPost, topics]);

  // load subtopics when topic changes
  useEffect(() => {
    setSubTopicId('');
    setSubTopics([]);
    if (!topicId) return;
    setSubLoading(true);
    fetch(`${API}/api/topics/${topicId}/subtopics`)
      .then((r) => r.json())
      .then((d) => {
        const subs = ((d.subtopics ?? []) as ApiSubTopic[]).filter((s) => s.isActive !== false);
        setSubTopics(subs);
        if (editPost) {
          const match = subs.find((s) => s.name.toLowerCase() === (editPost.subTopic ?? '').toLowerCase());
          if (match) setSubTopicId(match._id);
        }
      })
      .catch(() => {})
      .finally(() => setSubLoading(false));
  }, [topicId]);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    e.target.value = '';
    const remaining = 5 - imagePreviews.length;
    const toAdd = picked.slice(0, remaining);
    toAdd.forEach((f) => {
      const url = URL.createObjectURL(f);
      setImagePreviews((p) => [...p, url]);
      setImageFiles((p) => [...p, f]);
    });
  };

  const removeImage = (idx: number) => {
    setImagePreviews((p) => p.filter((_, i) => i !== idx));
    setImageFiles((p) => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!content.trim()) { setError('Content is required.'); return; }
    setSaving(true); setError('');

    try {
      let imageUrls: string[] = imagePreviews.filter((u) => !u.startsWith('blob:'));

      // upload new files
      if (imageFiles.length) {
        const fd = new FormData();
        imageFiles.forEach((f) => fd.append('images', f));
        const r = await fetch(`${API}/api/auth/upload/images`, {
          method: 'POST', body: fd,
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });
        const d = await r.json();
        imageUrls = [...imageUrls, ...(d.urls ?? [])];
      }

      const topicName    = topics.find((t) => t._id === topicId)?.name ?? '';
      const subTopicName = subTopics.find((s) => s._id === subTopicId)?.name ?? null;

      const body: Record<string, unknown> = {
        title:    title.trim() || null,
        content:  content.trim(),
        topic:    topicName,
        subTopic: subTopicName,
        ...(imageUrls.length ? { images: imageUrls, image: imageUrls[0] } : {}),
        authorName:     user.name,
        authorUsername: user.username,
        authorAvatar:   user.avatar ?? null,
      };

      const url    = editPost ? `${API}/api/posts/${editPost.id}` : `${API}/api/posts`;
      const method = editPost ? 'PATCH' : 'POST';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Failed to save post.'); return; }

      onSaved(mapPost(data.post as Record<string, unknown>), !!editPost);
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography fontWeight={700}>{editPost ? 'Edit Post' : 'Create Post'}</Typography>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pb: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Author row */}
        <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
          <Avatar src={user.avatar} sx={{ width: 36, height: 36 }}>
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{user.name}</Typography>
            <Typography variant="caption" color="text.secondary">@{user.username}</Typography>
          </Box>
        </Stack>

        {/* Title */}
        <TextField
          label="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth size="small" sx={{ mb: 2 }}
          inputProps={{ maxLength: 300 }}
        />

        {/* Content */}
        <TextField
          label="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          fullWidth multiline rows={4} sx={{ mb: 2 }}
          inputProps={{ maxLength: 2000 }}
          helperText={`${content.length}/2000`}
        />

        {/* Topic + Subtopic */}
        <Stack direction="row" spacing={1.5} mb={2}>
          <TextField
            select label="Topic" value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            fullWidth size="small"
          >
            <MenuItem value=""><em>Select topic…</em></MenuItem>
            {topics.map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
          </TextField>
          <TextField
            select label={subLoading ? 'Loading…' : 'Subtopic'}
            value={subTopicId}
            onChange={(e) => setSubTopicId(e.target.value)}
            fullWidth size="small"
            disabled={!topicId || subLoading}
          >
            <MenuItem value=""><em>None (optional)</em></MenuItem>
            {subTopics.map((s) => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
          </TextField>
        </Stack>

        {/* Images */}
        {imagePreviews.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1.5 }}>
            {imagePreviews.map((src, i) => (
              <Box key={i} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
                <Box component="img" src={src} sx={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                <IconButton
                  size="small"
                  onClick={() => removeImage(i)}
                  sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.55)', color: 'white', p: 0.3,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
                >
                  <Close sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {imagePreviews.length < 5 && (
          <Button
            startIcon={<Image />}
            size="small"
            variant="outlined"
            onClick={() => fileRef.current?.click()}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {imagePreviews.length > 0 ? `Add more (${imagePreviews.length}/5)` : 'Add images'}
          </Button>
        )}
        <input ref={fileRef} type="file" multiple accept="image/*" hidden onChange={handleImagePick} />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained" onClick={handleSubmit}
          disabled={saving || !content.trim()}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
        >
          {saving ? <CircularProgress size={18} color="inherit" /> : editPost ? 'Save Changes' : 'Publish'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── My Post Card (with edit / delete menu) ────────────────────────────────────

function MyPostCard({
  post,
  isOwn,
  onEdit,
  onDelete,
}: {
  post: Post;
  isOwn: boolean;
  onEdit: (p: Post) => void;
  onDelete: (id: string) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setAnchorEl(null);
    if (!confirm('Delete this post permanently?')) return;
    setDeleting(true);
    onDelete(post.id);
  };

  if (deleting) return null;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* 3-dot menu for own posts */}
      {isOwn && (
        <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
          <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
            <MoreHoriz fontSize="small" />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
            PaperProps={{ sx: { borderRadius: 2, minWidth: 140 } }}>
            <MenuItem onClick={() => { setAnchorEl(null); onEdit(post); }}>
              <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      )}
      <PostCard post={post} />
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function PostsPage() {
  const { user, accessToken } = useAppSelector((s) => s.auth);
  const navigate = useNavigate();

  const [posts, setPosts]       = useState<Post[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [topics, setTopics]     = useState<ApiTopic[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);

  const [snack, setSnack] = useState('');

  // redirect if not logged in
  useEffect(() => {
    if (!accessToken) navigate('/login', { replace: true });
  }, [accessToken]);

  // load topics
  useEffect(() => {
    fetch(`${API}/api/topics`)
      .then((r) => r.json())
      .then((d) => setTopics(((d.topics ?? []) as ApiTopic[]).filter((t) => t.isActive !== false)))
      .catch(() => {});
  }, []);

  // load my posts
  const fetchPosts = async (pg: number, append = false) => {
    if (!user?.id || !accessToken) return;
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res  = await fetch(`${API}/api/posts/user/${user.id}?page=${pg}&limit=12`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!data.success) return;
      const mapped = (data.posts as Record<string, unknown>[]).map(mapPost);
      setPosts((prev) => append ? [...prev, ...mapped] : mapped);
      setHasMore(pg < (data.pagination?.pages ?? 1));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { fetchPosts(1); }, [user?.id]);

  const handleSaved = (saved: Post, isEdit: boolean) => {
    if (isEdit) {
      setPosts((prev) => prev.map((p) => p.id === saved.id ? saved : p));
      setSnack('Post updated.');
    } else {
      setPosts((prev) => [saved, ...prev]);
      setSnack('Post published.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API}/api/posts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken ?? ''}` },
      });
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setSnack('Post deleted.');
    } catch {
      setSnack('Failed to delete post.');
    }
  };

  if (!user || !accessToken) return null;

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>

      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800}>My Posts</Typography>
          <Typography variant="body2" color="text.secondary">
            {posts.length} post{posts.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => { setEditPost(null); setFormOpen(true); }}
          sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
        >
          New Post
        </Button>
      </Stack>

      {/* Feed */}
      {loading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Card key={i} sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} mb={2}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box flex={1}><Skeleton width="40%" /><Skeleton width="25%" /></Box>
                </Stack>
                <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : posts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Article sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" fontWeight={600}>No posts yet</Typography>
          <Typography variant="body2" color="text.disabled" mb={3}>
            Share your thoughts, quiz results, or anything with the community.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => { setEditPost(null); setFormOpen(true); }}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
          >
            Create your first post
          </Button>
        </Box>
      ) : (
        <Stack spacing={2}>
          {posts.map((post) => (
            <MyPostCard
              key={post.id}
              post={post}
              isOwn={post.author.id === user.id}
              onEdit={(p) => { setEditPost(p); setFormOpen(true); }}
              onDelete={handleDelete}
            />
          ))}

          {hasMore && (
            <Button
              fullWidth variant="outlined"
              onClick={() => { const next = page + 1; setPage(next); fetchPosts(next, true); }}
              disabled={loadingMore}
              sx={{ borderRadius: 2.5, textTransform: 'none', mt: 1 }}
            >
              {loadingMore ? <CircularProgress size={18} /> : 'Load more'}
            </Button>
          )}
        </Stack>
      )}

      {/* Create / Edit form */}
      <PostForm
        open={formOpen}
        editPost={editPost}
        topics={topics}
        accessToken={accessToken}
        user={user}
        onClose={() => { setFormOpen(false); setEditPost(null); }}
        onSaved={handleSaved}
      />

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
