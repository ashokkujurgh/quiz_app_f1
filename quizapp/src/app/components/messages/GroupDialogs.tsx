import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Avatar, Typography,
  Checkbox, Box, CircularProgress, Alert, Chip, Divider, IconButton, InputAdornment,
} from '@mui/material';
import { Search, Edit, Check, Close, GroupAdd, ExitToApp, DeleteOutline, Groups, PhotoCamera } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchFriends } from '../../store/slices/friendsSlice';
import { fetchConversations, setActiveConv, type Conversation, type MsgUser } from '../../store/slices/messagesSlice';
import { apiFetch } from '../../utils/apiFetch';
import { IMAGE_ACCEPT, uploadImageFile } from '../../utils/imageUpload';

const NAME_MAX = 80;   // matches the Conversation model

async function call(path: string, method: string, body?: unknown) {
  const res = await apiFetch(path, {
    method,
    ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message ?? 'Something went wrong');
  return data;
}

const displayName = (u: { name?: string; username: string }) => u.name || u.username;

// ── Friend picker (used to create a group and to add members) ─────────────────
function FriendPicker({ exclude, selected, onChange }: {
  exclude: string[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const dispatch = useAppDispatch();
  const { friends, loading } = useAppSelector((s) => s.friends);
  const [q, setQ] = useState('');
  useEffect(() => { dispatch(fetchFriends()); }, [dispatch]);

  const list = useMemo(() => friends
    .filter((f) => !exclude.includes(f._id))
    .filter((f) => `${f.name} ${f.username}`.toLowerCase().includes(q.trim().toLowerCase())), [friends, exclude, q]);
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <Box>
      <TextField fullWidth size="small" placeholder="Search friends" value={q} onChange={(e) => setQ(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        sx={{ mb: 1 }} />
      <Box sx={{ maxHeight: 280, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        {loading && friends.length === 0 && <Box textAlign="center" py={3}><CircularProgress size={22} /></Box>}
        {!loading && list.length === 0 && (
          <Typography variant="body2" color="text.secondary" p={2} textAlign="center">
            {friends.length === 0 ? 'Add friends first — groups are made from your friends.' : 'No more friends to add.'}
          </Typography>
        )}
        {list.map((f) => (
          <Stack key={f._id} direction="row" alignItems="center" spacing={1.5} px={1} py={0.5}
            onClick={() => toggle(f._id)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
            <Checkbox size="small" checked={selected.includes(f._id)} tabIndex={-1} />
            <Avatar src={f.avatar ?? undefined} sx={{ width: 32, height: 32 }}>{displayName(f)[0]?.toUpperCase()}</Avatar>
            <Box minWidth={0}>
              <Typography fontSize={14} fontWeight={600} noWrap>{displayName(f)}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>@{f.username}</Typography>
            </Box>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

// ── Create group ──────────────────────────────────────────────────────────────
export function CreateGroupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) { setName(''); setMembers([]); setError(''); } }, [open]);

  const create = async () => {
    setSaving(true); setError('');
    try {
      const { data } = await call('/api/messages/groups', 'POST', { name: name.trim(), participantIds: members });
      await dispatch(fetchConversations());
      dispatch(setActiveConv(data._id));
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle fontWeight={700}>New group</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField autoFocus fullWidth label="Group name" value={name} onChange={(e) => setName(e.target.value)}
          inputProps={{ maxLength: NAME_MAX }} sx={{ mt: 1, mb: 2 }} />
        <Typography variant="subtitle2" mb={1}>
          Add members {members.length > 0 && <Chip size="small" label={members.length} sx={{ ml: 0.5 }} />}
        </Typography>
        <FriendPicker exclude={[]} selected={members} onChange={setMembers} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={create} disabled={saving || !name.trim() || members.length === 0}>
          {saving ? <CircularProgress size={18} color="inherit" /> : 'Create group'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Group info: rename, members, add members, leave, delete ───────────────────
export function GroupInfoDialog({ conv, open, onClose }: { conv: Conversation; open: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const myId = useAppSelector((s) => s.auth.user?.id);
  const isAdmin = !!myId && (conv.admins ?? []).includes(myId);
  const members: MsgUser[] = conv.participantUsers ?? [];

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(conv.name ?? '');
  const [adding, setAdding] = useState(false);
  const [toAdd, setToAdd] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<'delete' | 'leave' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (open) { setEditing(false); setName(conv.name ?? ''); setAdding(false); setToAdd([]); setConfirm(null); setError(''); }
  }, [open, conv.name]);

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(true); setError('');
    try {
      await fn();
      await dispatch(fetchConversations());
      after?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoUploading(true); setError('');
    try {
      await uploadImageFile(`/api/messages/groups/${conv._id}/icon`, 'icon', file);
      await dispatch(fetchConversations());   // members get group:updated and refresh too
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const saveName = () => run(() => call(`/api/messages/groups/${conv._id}`, 'PATCH', { name: name.trim() }), () => setEditing(false));
  const addMembers = () => run(() => call(`/api/messages/groups/${conv._id}/members`, 'POST', { userIds: toAdd }),
    () => { setAdding(false); setToAdd([]); });
  const leave = () => run(() => call(`/api/messages/groups/${conv._id}/leave`, 'POST'), () => { dispatch(setActiveConv(null)); onClose(); });
  const remove = () => run(() => call(`/api/messages/groups/${conv._id}`, 'DELETE'), () => { dispatch(setActiveConv(null)); onClose(); });

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle fontWeight={700}>Group info</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Group photo — admins can change it */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar src={conv.icon ?? undefined} sx={{ width: 84, height: 84, bgcolor: 'secondary.main' }}>
              <Groups sx={{ fontSize: 44 }} />
            </Avatar>
            {isAdmin && (
              <>
                <input ref={photoInput} type="file" accept={IMAGE_ACCEPT} hidden onChange={handlePhotoPick} />
                <IconButton size="small" onClick={() => photoInput.current?.click()} disabled={photoUploading || busy}
                  aria-label="Change group photo"
                  sx={{ position: 'absolute', bottom: -4, right: -4, bgcolor: 'primary.main', color: 'white',
                        border: '2px solid', borderColor: 'background.paper', '&:hover': { bgcolor: 'primary.dark' },
                        '&.Mui-disabled': { bgcolor: 'primary.main', color: 'white' } }}>
                  {photoUploading ? <CircularProgress size={16} color="inherit" /> : <PhotoCamera sx={{ fontSize: 16 }} />}
                </IconButton>
              </>
            )}
          </Box>
        </Box>

        {/* Name */}
        {editing ? (
          <Stack direction="row" spacing={1} alignItems="center" mt={1} mb={2}>
            <TextField autoFocus fullWidth size="small" label="Group name" value={name}
              onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: NAME_MAX }}
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) saveName(); }} />
            <IconButton color="primary" onClick={saveName} disabled={busy || !name.trim()} aria-label="Save name"><Check /></IconButton>
            <IconButton onClick={() => { setEditing(false); setName(conv.name ?? ''); }} disabled={busy} aria-label="Cancel"><Close /></IconButton>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center" mt={1} mb={2}>
            <Typography fontWeight={700} fontSize={18} flex={1} sx={{ wordBreak: 'break-word' }}>{conv.name}</Typography>
            {isAdmin && <IconButton size="small" onClick={() => setEditing(true)} aria-label="Rename group"><Edit fontSize="small" /></IconButton>}
          </Stack>
        )}

        {/* Members */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle2">{members.length} members</Typography>
          {isAdmin && !adding && (
            <Button size="small" startIcon={<GroupAdd />} onClick={() => setAdding(true)}>Add members</Button>
          )}
        </Stack>

        {adding ? (
          <Box mb={2}>
            <FriendPicker exclude={conv.participants} selected={toAdd} onChange={setToAdd} />
            <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1}>
              <Button size="small" onClick={() => { setAdding(false); setToAdd([]); }} disabled={busy}>Cancel</Button>
              <Button size="small" variant="contained" onClick={addMembers} disabled={busy || toAdd.length === 0}>
                Add {toAdd.length > 0 ? toAdd.length : ''}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 260, overflowY: 'auto', mb: 2 }}>
            {members.map((m) => (
              <Stack key={m._id} direction="row" alignItems="center" spacing={1.5} py={0.75}>
                <Avatar src={m.avatar ?? undefined} sx={{ width: 32, height: 32 }}>{displayName(m)[0]?.toUpperCase()}</Avatar>
                <Typography fontSize={14} flex={1} noWrap>{displayName(m)}{m._id === myId ? ' (you)' : ''}</Typography>
                {(conv.admins ?? []).includes(m._id) && <Chip size="small" label="Admin" variant="outlined" color="primary" />}
              </Stack>
            ))}
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Leave / delete */}
        {confirm ? (
          <Alert severity="warning" action={
            <Stack direction="row" spacing={1}>
              <Button size="small" color="inherit" onClick={() => setConfirm(null)} disabled={busy}>No</Button>
              <Button size="small" color="error" variant="contained" disabled={busy}
                onClick={confirm === 'delete' ? remove : leave}>
                {busy ? <CircularProgress size={16} color="inherit" /> : 'Yes'}
              </Button>
            </Stack>
          }>
            {confirm === 'delete' ? 'Delete this group and all its messages for everyone?' : 'Leave this group?'}
          </Alert>
        ) : (
          <Stack spacing={1}>
            <Button color="warning" startIcon={<ExitToApp />} onClick={() => setConfirm('leave')} sx={{ justifyContent: 'flex-start' }}>
              Leave group
            </Button>
            {isAdmin && (
              <Button color="error" startIcon={<DeleteOutline />} onClick={() => setConfirm('delete')} sx={{ justifyContent: 'flex-start' }}>
                Delete group
              </Button>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
