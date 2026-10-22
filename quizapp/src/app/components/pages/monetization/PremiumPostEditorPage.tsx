import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert, AlertTitle, Box, Button, Card, CardContent, CardMedia, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, LinearProgress, List, ListItem, ListItemIcon, ListItemText, MenuItem, Select, Stack, TextField, Typography, Autocomplete,
} from '@mui/material';
import { AutoAwesome, CheckCircle, RadioButtonUnchecked, CloudUpload, Visibility, Send, Undo } from '@mui/icons-material';
import { api, ApiError, formatDateTime } from '../../../utils/monetization';
import { apiFetch } from '../../../utils/apiFetch';
import { loadTopicsWithSubtopics, type CachedSubTopic, type CachedTopic } from '../../../utils/topicsCache';
import { RichTextEditor } from '../../shared/RichTextEditor';
import { RichContent } from '../../shared/RichContent';
import { StatusChip } from '../../monetization/StatusChip';
import { UpgradePrompt } from '../../monetization/UpgradePrompt';

const API = import.meta.env.VITE_API_URL ?? '';

interface Draft { title: string; content: string; topic: string; subTopic: string | null; tags: string[]; coverImage: string | null; images: string[]; isAiImage: boolean }
interface OwnPost { id: string; status: string; reviewState: string; displayStatus: string; draft: Draft; hasUnsubmittedChanges: boolean; version: number; lastRejectionReason: string | null; publicPostId: string | null }
interface Check { id: string; ok: boolean; message: string }
interface Revision { _id: string; version: number; status: string; submittedAt: string; decidedAt: string | null; title: string; decisionReason: string | null }
interface Meta { aiImage: { enabled: boolean; dailyLimit: number; used: number; remaining: number; message: string | null }; imageRules: { maxBytes: number; minWidth: number; minHeight: number } }
interface Candidate { id: string; url: string; width: number; height: number; expiresAt: string }

const EMPTY: Draft = { title: '', content: '', topic: '', subTopic: null, tags: [], coverImage: null, images: [], isAiImage: false };

export function PremiumPostEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [postId, setPostId] = useState<string | null>(id ?? null);
  const [post, setPost] = useState<OwnPost | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [checks, setChecks] = useState<Check[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [topics, setTopics] = useState<CachedTopic[]>([]);
  const [subTopics, setSubTopics] = useState<CachedSubTopic[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dirty = useRef(false);
  const saveTimer = useRef<number | null>(null);

  const apply = (p: OwnPost) => { setPost(p); setDraft(p.draft); };

  const load = useCallback(async (pid: string) => {
    const d = await api<{ post: OwnPost; checks: Check[]; revisions: Revision[] }>(`/api/posts/premium/${pid}`);
    apply(d.post); setChecks(d.checks); setRevisions(d.revisions);
  }, []);

  useEffect(() => {
    loadTopicsWithSubtopics().then((t) => { setTopics(t.topics); setSubTopics(t.subTopics); }).catch(() => undefined);
    api<Meta>('/api/posts/premium/meta').then(setMeta).catch(() => undefined);
    if (id) load(id).catch((e) => setError(e)).finally(() => setLoading(false));
  }, [id, load]);

  const locked = post?.reviewState === 'in_review';

  // Save the draft (creates it the first time). Autosaves 2 s after the last change.
  const save = useCallback(async (next: Draft): Promise<string | null> => {
    setSaving('saving');
    try {
      const body = { title: next.title, content: next.content, topic: next.topic, subTopic: next.subTopic, tags: next.tags, coverImage: next.coverImage };
      const d = postId
        ? await api<{ post: OwnPost }>(`/api/posts/premium/${postId}`, { method: 'PATCH', json: body })
        : await api<{ post: OwnPost }>('/api/posts/premium', { method: 'POST', json: body });
      if (!postId) { setPostId(d.post.id); window.history.replaceState(null, '', `/creator/posts/${d.post.id}`); }
      setPost(d.post);
      dirty.current = false;
      setSaving('saved');
      const c = await api<{ checks: Check[] }>(`/api/posts/premium/${d.post.id}`);
      setChecks(c.checks);
      return d.post.id;
    } catch (e) {
      setSaving('error'); setError(e as ApiError);
      return null;
    }
  }, [postId]);

  const update = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    dirty.current = true;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => save(next), 2000);
  };

  useEffect(() => () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); }, []);

  const saveNow = async () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); return save(draft); };

  const upload = async (file: File) => {
    setUploading(true); setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await apiFetch(`${API}/api/posts/premium/upload`, { method: 'POST', body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new ApiError(d.message ?? 'Upload failed.', res.status, d.code);
      update({ coverImage: d.image.url, isAiImage: false });
    } catch (e) { setError(e as ApiError); } finally { setUploading(false); }
  };

  const generate = async () => {
    setAiBusy(true); setError(null);
    try {
      const pid = postId ?? (await saveNow());
      if (!pid) return;
      if (dirty.current) await saveNow();
      const d = await api<{ candidate: Candidate; usage: Meta['aiImage'] }>(`/api/posts/premium/${pid}/ai-image`, { method: 'POST' });
      setCandidate(d.candidate);
      setMeta((m) => m ? { ...m, aiImage: d.usage } : m);
    } catch (e) { setError(e as ApiError); } finally { setAiBusy(false); }
  };

  const acceptCandidate = async () => {
    if (!candidate || !postId) return;
    try {
      const d = await api<{ post: OwnPost }>(`/api/posts/premium/${postId}/ai-image/${candidate.id}/accept`, { method: 'POST', json: { setAsCover: true } });
      if (d.post) apply(d.post);
      setCandidate(null);
    } catch (e) { setError(e as ApiError); }
  };

  const discardCandidate = async () => {
    if (!candidate || !postId) return;
    await api(`/api/posts/premium/${postId}/ai-image/${candidate.id}/discard`, { method: 'POST' }).catch(() => undefined);
    setCandidate(null);
  };

  const submit = async () => {
    setConfirmSubmit(false); setSubmitting(true); setError(null);
    try {
      const pid = await saveNow();
      if (!pid) return;
      const d = await api<{ message: string }>(`/api/posts/premium/${pid}/submit`, { method: 'POST' });
      setNotice(d.message);
      await load(pid);
    } catch (e) {
      const err = e as ApiError;
      if (err.body?.checks) setChecks((c) => c.map((x) => ({ ...x, ok: !(err.body.checks as Check[]).some((f) => f.id === x.id) })));
      setError(err);
    } finally { setSubmitting(false); }
  };

  const withdraw = async () => {
    if (!postId || !window.confirm('Withdraw this submission? You can edit and submit again.')) return;
    try { const d = await api<{ post: OwnPost }>(`/api/posts/premium/${postId}/withdraw`, { method: 'POST' }); apply(d.post); await load(postId); } catch (e) { setError(e as ApiError); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const subsForTopic = subTopics.filter((s) => topics.find((t) => t.name === draft.topic)?._id === s.topic);
  const latest = revisions[0];
  const allOk = checks.length > 0 && checks.every((c) => c.ok);

  return (
    <Box maxWidth={900}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} spacing={1}>
        <Box>
          <Typography variant="h5" fontWeight={800}>{postId ? 'Edit premium post' : 'New premium post'}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
            {post && <StatusChip status={post.displayStatus} />}
            <Typography variant="caption" color="text.secondary" aria-live="polite">
              {saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Draft saved' : saving === 'error' ? 'Not saved' : ''}
            </Typography>
          </Stack>
        </Box>
        <Button onClick={() => navigate('/creator')}>Back to dashboard</Button>
      </Stack>

      {error && (error.code === 'CREATOR_NOT_ELIGIBLE'
        ? <Box mb={2}><UpgradePrompt plan="creator" message={error.message} onClose={() => setError(null)} /></Box>
        : <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error.code === 'CREATOR_RESTRICTED' ? <AlertTitle>Submissions blocked</AlertTitle> : null}{error.message}</Alert>)}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {post?.status === 'published' && <Alert severity="info" sx={{ mb: 2 }}>This post is live. Changes you submit are reviewed first — the current version stays live until the new one is approved.</Alert>}
      {locked && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" startIcon={<Undo />} onClick={withdraw}>Withdraw</Button>}>
          Version {latest?.version} is waiting for a reviewer (submitted {formatDateTime(latest?.submittedAt)}). Edits you make now are saved as a draft and are not part of that review.
        </Alert>
      )}
      {post?.lastRejectionReason && post.reviewState === 'rejected' && (
        <Alert severity="error" sx={{ mb: 2 }}><AlertTitle>Reviewer feedback</AlertTitle>{post.lastRejectionReason}</Alert>
      )}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <TextField label="Title" value={draft.title} onChange={(e) => update({ title: e.target.value })} inputProps={{ maxLength: 150 }} helperText={`${draft.title.length}/150 — clear and specific, no clickbait`} required />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth required>
                <InputLabel id="topic-label">Category</InputLabel>
                <Select labelId="topic-label" label="Category" value={draft.topic} onChange={(e) => update({ topic: e.target.value, subTopic: null })}>
                  {topics.map((t) => <MenuItem key={t._id} value={t.name}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth disabled={!subsForTopic.length}>
                <InputLabel id="sub-label">Subcategory</InputLabel>
                <Select labelId="sub-label" label="Subcategory" value={draft.subTopic ?? ''} onChange={(e) => update({ subTopic: e.target.value || null })}>
                  <MenuItem value="">None</MenuItem>
                  {subsForTopic.map((s) => <MenuItem key={s._id} value={s.name}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Autocomplete
              multiple freeSolo options={[]} value={draft.tags}
              onChange={(_, v) => update({ tags: (v as string[]).map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean).slice(0, 8) })}
              renderTags={(value, getTagProps) => value.map((option, index) => <Chip size="small" label={option} {...getTagProps({ index })} key={option} />)}
              renderInput={(params) => <TextField {...params} label="Tags" placeholder="Type a tag and press Enter" helperText="Up to 8 tags, e.g. polity, upsc" />}
            />
            <Box>
              <Typography variant="body2" fontWeight={600} mb={0.5}>Content</Typography>
              <RichTextEditor value={draft.content} onChange={(html) => update({ content: html })} placeholder="Write your article…" minHeight={320} />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={700} mb={1}>Cover image</Typography>
          {draft.coverImage && (
            <Box sx={{ mb: 1.5, position: 'relative', maxWidth: 480 }}>
              <CardMedia component="img" image={draft.coverImage} alt="Cover image" sx={{ borderRadius: 2, aspectRatio: '1.9 / 1', objectFit: 'cover' }} />
              {draft.isAiImage && <Chip size="small" label="AI-generated" sx={{ position: 'absolute', top: 8, left: 8 }} />}
            </Box>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button component="label" variant="outlined" startIcon={uploading ? <CircularProgress size={16} /> : <CloudUpload />} disabled={uploading}>
              {draft.coverImage ? 'Replace image' : 'Upload image'}
              <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
            </Button>
            <Button variant="outlined" color="secondary" startIcon={aiBusy ? <CircularProgress size={16} /> : <AutoAwesome />} disabled={aiBusy || !meta?.aiImage.enabled || (meta?.aiImage.remaining ?? 0) <= 0} onClick={generate}>
              {aiBusy ? 'Generating… (up to a minute)' : 'Generate AI image'}
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            JPEG, PNG or WebP, at least {meta?.imageRules.minWidth ?? 600}×{meta?.imageRules.minHeight ?? 315} px, up to 5 MB.{' '}
            {meta && (meta.aiImage.enabled ? `AI images left today: ${meta.aiImage.remaining} of ${meta.aiImage.dailyLimit}.` : meta.aiImage.message)}
          </Typography>
          {aiBusy && <LinearProgress sx={{ mt: 1 }} />}
          {candidate && (
            <Card variant="outlined" sx={{ mt: 2, maxWidth: 480 }}>
              <CardMedia component="img" image={candidate.url} alt="AI-generated cover image preview" sx={{ aspectRatio: '1.5 / 1', objectFit: 'cover' }} />
              <CardContent>
                <Typography variant="body2" mb={1}>Use this image as your cover?</Typography>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" size="small" onClick={acceptCandidate}>Accept</Button>
                  <Button size="small" onClick={generate} disabled={aiBusy || (meta?.aiImage.remaining ?? 0) <= 0}>Regenerate</Button>
                  <Button size="small" color="inherit" onClick={discardCandidate}>Discard</Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={700}>Before you submit</Typography>
          <List dense>
            {checks.map((c) => (
              <ListItem key={c.id} disableGutters>
                <ListItemIcon sx={{ minWidth: 32 }}>{c.ok ? <CheckCircle color="success" fontSize="small" /> : <RadioButtonUnchecked fontSize="small" />}</ListItemIcon>
                <ListItemText primary={c.message} />
              </ListItem>
            ))}
            {!checks.length && <Typography variant="body2" color="text.secondary">Start writing — the checklist appears after the first save.</Typography>}
          </List>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            Every premium post is screened automatically and then approved or rejected by a reviewer. Confirmed policy violations lead to warnings and, after the third, a 30-day block.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={saveNow} disabled={saving === 'saving'}>Save draft</Button>
            <Button variant="outlined" startIcon={<Visibility />} onClick={() => setPreviewOpen(true)}>Preview</Button>
            <Button variant="contained" startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Send />} disabled={!allOk || locked || submitting} onClick={() => setConfirmSubmit(true)}>
              {post?.status === 'published' ? 'Submit changes for review' : 'Submit for review'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {revisions.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography fontWeight={700} mb={1}>Review history</Typography>
            <Stack spacing={1}>
              {revisions.map((r) => (
                <Box key={r._id}>
                  <Stack direction="row" spacing={1} alignItems="center"><StatusChip status={r.status} /><Typography variant="body2">Version {r.version} · submitted {formatDateTime(r.submittedAt)}{r.decidedAt && ` · decided ${formatDateTime(r.decidedAt)}`}</Typography></Stack>
                  {r.decisionReason && <Typography variant="body2" color="text.secondary" sx={{ ml: 1, mt: 0.5 }}>Feedback: {r.decisionReason}</Typography>}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Preview</DialogTitle>
        <DialogContent dividers>
          {draft.coverImage && <Box component="img" src={draft.coverImage} alt="" sx={{ width: '100%', borderRadius: 2, mb: 2 }} />}
          <Typography variant="h4" fontWeight={800} mb={1}>{draft.title || 'Untitled'}</Typography>
          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">{[draft.topic, draft.subTopic].filter(Boolean).map((t) => <Chip key={t} size="small" label={t} />)}{draft.tags.map((t) => <Chip key={t} size="small" variant="outlined" label={`#${t}`} />)}</Stack>
          <RichContent content={draft.content} />
        </DialogContent>
        <DialogActions><Button onClick={() => setPreviewOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={confirmSubmit} onClose={() => setConfirmSubmit(false)}>
        <DialogTitle>Submit for review?</DialogTitle>
        <DialogContent><Typography>A reviewer will approve or reject this version. You'll get an email either way. Nothing is published before approval.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setConfirmSubmit(false)}>Cancel</Button><Button variant="contained" onClick={submit}>Submit</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
