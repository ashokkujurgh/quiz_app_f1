import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert, AlertTitle, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControlLabel, MenuItem, Stack, TextField, Typography, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { api, formatDate, formatDateTime } from '../../../utils/monetization';
import { RichContent } from '../../shared/RichContent';
import { StatusChip } from '../../monetization/StatusChip';
import { useAppSelector } from '../../../store/hooks';

interface Revision { _id: string; version: number; title: string; content: string; coverImage: string; images: string[]; isAiImage: boolean; topic: string; subTopic: string | null; tags: string[]; wordCount: number; status: string; submittedAt: string; decidedAt: string | null; decisionReason: string | null; creatorId: string }
interface Screening { status: string; errorCode: string | null; summary: string; output: { relevant: boolean; quality_score: number; reasons: string[]; recommended_action: string; flags: Record<string, boolean | null> } | null; heuristics: { flags: string[]; promoMatches: string[]; suspiciousLinks: string[]; viewBaitMatches: string[]; duplicateOf: string | null; wordCount: number } }
interface Detail {
  revision: Revision; liveVersion: { version: number; title: string; content: string } | null; screening: Screening | null;
  creator: { id: string; name: string; username: string; memberSince: string | null; submissions: Record<string, number>; confirmedViolations: number; restrictedUntil: string | null; violations: { id: string; postTitle: string; category: string; reason: string; confirmedAt: string; consequence: string; status: string; appeal: { status: string; text: string | null } }[] };
  history: { _id: string; action: string; actorRole: string; note: string | null; details: Record<string, unknown>; createdAt: string }[];
}

const CATEGORIES = ['irrelevant', 'low_quality', 'spam', 'misleading', 'unsafe', 'copied', 'promotional', 'view_manipulation', 'inappropriate_image', 'other'];
const FLAG_LABEL: Record<string, string> = { title_ok: 'Title OK', length_ok: 'Length OK', spam_or_stuffing: 'Spam / stuffing', misleading_or_unsafe: 'Misleading / unsafe', likely_copied: 'Likely copied', promotional: 'Promotional', suspicious_links: 'Suspicious links', view_manipulation: 'View manipulation', image_relevant: 'Image relevant' };
const GOOD_WHEN_TRUE = new Set(['title_ok', 'length_ok', 'image_relevant']);

/** /review/:revisionId — moderation detail with approve / reject. */
export function ReviewDetailPage() {
  const { revisionId } = useParams<{ revisionId: string }>();
  const navigate = useNavigate();
  const me = useAppSelector((s) => s.auth.user);
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [view, setView] = useState<'submitted' | 'live'>('submitted');
  const [note, setNote] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [violation, setViolation] = useState(false);
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api<Detail>(`/api/moderation/${revisionId}`).then(setD).catch((e) => setError(e.message)), [revisionId]);
  useEffect(() => { load(); }, [load]);

  const decide = async (path: 'approve' | 'reject', body: object) => {
    setBusy(true); setError('');
    try {
      await api(`/api/moderation/${revisionId}/${path}`, { method: 'POST', json: body });
      setDone(path === 'approve' ? 'Approved and published. The creator has been emailed.' : 'Rejected. The creator has been emailed your feedback.');
      setApproveOpen(false); setRejectOpen(false); load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const addNote = async () => {
    try { await api(`/api/moderation/${revisionId}/notes`, { method: 'POST', json: { note } }); setNote(''); load(); } catch (e) { setError((e as Error).message); }
  };

  if (!d) return error ? <Alert severity="error">{error}</Alert> : <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  const r = d.revision;
  const own = me?.id === r.creatorId;
  const open = r.status === 'in_review';
  const shown = view === 'live' && d.liveVersion ? d.liveVersion : r;
  const s = d.screening;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Review: version {r.version}</Typography>
          <Stack direction="row" spacing={1} alignItems="center"><StatusChip status={r.status} /><Typography variant="caption" color="text.secondary">Submitted {formatDateTime(r.submittedAt)}</Typography></Stack>
        </Box>
        <Button onClick={() => navigate('/review')}>Back to queue</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {done && <Alert severity="success" sx={{ mb: 2 }}>{done}</Alert>}
      {own && <Alert severity="warning" sx={{ mb: 2 }}>This is your own post. Another reviewer must decide it.</Alert>}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}>
        <Box>
          <Card variant="outlined">
            <CardContent>
              {d.liveVersion && (
                <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)} sx={{ mb: 2 }} aria-label="Compare versions">
                  <ToggleButton value="submitted">Submitted (v{r.version})</ToggleButton>
                  <ToggleButton value="live">Live now (v{d.liveVersion.version})</ToggleButton>
                </ToggleButtonGroup>
              )}
              {view === 'submitted' && <Box component="img" src={r.coverImage} alt="Cover image" sx={{ width: '100%', borderRadius: 2, mb: 2 }} />}
              {view === 'submitted' && r.isAiImage && <Chip size="small" label="AI-generated cover" sx={{ mb: 1 }} />}
              <Typography variant="h5" fontWeight={800} mb={1}>{shown.title}</Typography>
              <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
                <Chip size="small" label={`${r.topic}${r.subTopic ? ` › ${r.subTopic}` : ''}`} />
                {r.tags.map((t) => <Chip key={t} size="small" variant="outlined" label={`#${t}`} />)}
                <Chip size="small" variant="outlined" label={`${r.wordCount} words`} />
              </Stack>
              <RichContent content={shown.content} />
            </CardContent>
          </Card>
        </Box>

        <Stack spacing={2}>
          {open && !own && (
            <Card variant="outlined"><CardContent>
              <Typography fontWeight={700} mb={1}>Decision</Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" color="success" fullWidth onClick={() => setApproveOpen(true)} disabled={busy}>Approve</Button>
                <Button variant="outlined" color="error" fullWidth onClick={() => setRejectOpen(true)} disabled={busy}>Reject</Button>
              </Stack>
            </CardContent></Card>
          )}
          {r.decisionReason && <Alert severity="error"><AlertTitle>Rejection reason</AlertTitle>{r.decisionReason}</Alert>}

          <Card variant="outlined"><CardContent>
            <Typography fontWeight={700}>Automatic screening</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>Advice only. It never decides and never counts as a violation.</Typography>
            {!s ? <Typography variant="body2">Not run yet.</Typography> : s.output ? (
              <>
                <Stack direction="row" spacing={1} mb={1} flexWrap="wrap">
                  <Chip size="small" color={s.output.recommended_action === 'approve' ? 'success' : s.output.recommended_action === 'reject' ? 'error' : 'warning'} label={`Suggests: ${s.output.recommended_action}`} />
                  <Chip size="small" label={`Quality ${s.output.quality_score}/100`} />
                  <Chip size="small" color={s.output.relevant ? 'success' : 'error'} variant="outlined" label={s.output.relevant ? 'On topic' : 'Off topic'} />
                </Stack>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>{s.output.reasons.map((x) => <li key={x}><Typography variant="body2">{x}</Typography></li>)}</Box>
                <Stack direction="row" spacing={0.5} mt={1} flexWrap="wrap" useFlexGap>
                  {Object.entries(s.output.flags).filter(([, v]) => v !== null).map(([k, v]) => {
                    const bad = GOOD_WHEN_TRUE.has(k) ? v === false : v === true;
                    return <Chip key={k} size="small" variant={bad ? 'filled' : 'outlined'} color={bad ? 'warning' : 'default'} label={`${FLAG_LABEL[k] ?? k}: ${v ? 'yes' : 'no'}`} />;
                  })}
                </Stack>
              </>
            ) : <Alert severity="info">AI screening {s.status === 'skipped' ? 'is switched off' : `could not run (${s.errorCode?.replace(/_/g, ' ')})`}. Please review fully by hand.</Alert>}
            {s && s.heuristics.flags.length > 0 && (
              <Box mt={1.5}>
                <Typography variant="body2" fontWeight={600}>Automatic checks flagged</Typography>
                <Typography variant="body2" color="warning.main">{s.heuristics.flags.join(', ').replace(/_/g, ' ')}</Typography>
                {[...s.heuristics.promoMatches, ...s.heuristics.suspiciousLinks, ...s.heuristics.viewBaitMatches].slice(0, 6).map((m) => <Typography key={m} variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>{m}</Typography>)}
              </Box>
            )}
          </CardContent></Card>

          <Card variant="outlined"><CardContent>
            <Typography fontWeight={700}>Creator</Typography>
            <Typography>{d.creator.name} <Typography component="span" color="text.secondary">@{d.creator.username}</Typography></Typography>
            <Typography variant="caption" color="text.secondary" display="block">Member since {formatDate(d.creator.memberSince)} · approved {d.creator.submissions.approved ?? 0} · rejected {d.creator.submissions.rejected ?? 0}</Typography>
            {d.creator.restrictedUntil && <Alert severity="error" sx={{ mt: 1 }}>Blocked from submitting until {formatDate(d.creator.restrictedUntil)}</Alert>}
            <Typography variant="body2" mt={1}>Confirmed violations: <strong>{d.creator.confirmedViolations}</strong></Typography>
            {d.creator.violations.slice(0, 5).map((v) => (
              <Typography key={v.id} variant="caption" display="block" color={v.status === 'overturned' ? 'text.disabled' : 'text.secondary'}>
                {formatDate(v.confirmedAt)} · {v.category.replace(/_/g, ' ')} · {v.postTitle}{v.status === 'overturned' ? ' (overturned)' : ''}{v.appeal.status === 'pending' ? ' · appeal pending' : ''}
              </Typography>
            ))}
          </CardContent></Card>

          <Card variant="outlined"><CardContent>
            <Typography fontWeight={700} mb={1}>History & notes</Typography>
            <Stack spacing={0.75} mb={1.5}>
              {d.history.map((h) => (
                <Box key={h._id}>
                  <Typography variant="body2"><strong>{h.action.replace(/_/g, ' ')}</strong> · {h.actorRole} · {formatDateTime(h.createdAt)}</Typography>
                  {h.note && <Typography variant="body2" color="text.secondary">“{h.note}”</Typography>}
                </Box>
              ))}
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            <TextField size="small" fullWidth multiline minRows={2} label="Internal note (never shown to the creator)" value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 2000 }} />
            <Button size="small" sx={{ mt: 1 }} disabled={!note.trim()} onClick={addNote}>Add note</Button>
          </CardContent></Card>
        </Stack>
      </Box>

      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)}>
        <DialogTitle>Approve and publish?</DialogTitle>
        <DialogContent><Typography>Version {r.version} goes live for everyone{d.liveVersion ? ', replacing the current version' : ''}. The creator is emailed.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setApproveOpen(false)}>Cancel</Button><Button variant="contained" color="success" disabled={busy} onClick={() => decide('approve', { note: note.trim() || undefined })}>Approve</Button></DialogActions>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Reject this submission</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField autoFocus multiline minRows={3} label="Reason for the creator" value={reason} onChange={(e) => setReason(e.target.value)} helperText="Be specific so they can fix it (10–1000 characters). The creator sees this." inputProps={{ maxLength: 1000 }} />
            <FormControlLabel control={<Checkbox checked={violation} onChange={(e) => setViolation(e.target.checked)} />} label="This is a confirmed policy violation (counts toward warnings and blocks)" />
            {violation && (
              <TextField select label="Violation category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
            )}
            {violation && <Alert severity="warning">Only mark a violation when you are sure. Ordinary quality problems should be rejected without it.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={busy || reason.trim().length < 10 || (violation && !category)}
            onClick={() => decide('reject', { reason: reason.trim(), violation, violationCategory: violation ? category : undefined, note: note.trim() || undefined })}>Reject</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
