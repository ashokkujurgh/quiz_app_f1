import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Stack, Typography, TextField, IconButton, Divider,
  Avatar, CircularProgress, useMediaQuery, useTheme, Badge,
} from '@mui/material';
import { Send, ArrowBack, Message as MessageIcon, Image as ImageIcon, Close } from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchConversations, fetchMessages, sendMessage,
  setActiveConv, appendMessage, setTyping, upsertConversation,
  type Conversation,
} from '../../store/slices/messagesSlice';
import { EmptyState } from '../shared/EmptyState';
import { useOnlineUsers } from '../../context/OnlineUsersContext';
import { apiFetch } from '../../utils/apiFetch';
import { formatDistanceToNow } from 'date-fns';
import { Circle } from '@mui/icons-material';

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

function OnlineAvatar({ src, username, userId, size = 44 }: { src?: string; username: string; userId: string; size?: number }) {
  const { isOnline } = useOnlineUsers();
  const online = isOnline(userId);
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Avatar src={src} sx={{ width: size, height: size }}>
        {username[0]?.toUpperCase() ?? '?'}
      </Avatar>
      <Circle sx={{ position: 'absolute', bottom: 1, right: 1, fontSize: size * 0.28, color: online ? 'success.main' : 'text.disabled', bgcolor: 'background.paper', borderRadius: '50%' }} />
    </Box>
  );
}

function ConvItem({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  const unreadCount = useAppSelector((s) => s.messages.unreadByConv[conv._id] ?? 0);
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" px={2} py={1.5} onClick={onClick}
      sx={{ cursor: 'pointer', bgcolor: active ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' }, borderBottom: '1px solid', borderColor: 'divider' }}>
      {conv.otherUser ? (
        <Badge badgeContent={unreadCount > 0 ? unreadCount : undefined} color="primary" overlap="circular" anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <OnlineAvatar src={conv.otherUser.avatar ?? undefined} username={conv.otherUser.username} userId={conv.otherUser._id} size={44} />
        </Badge>
      ) : (
        <Avatar sx={{ width: 44, height: 44 }}>?</Avatar>
      )}
      <Box flex={1} minWidth={0}>
        <Typography fontWeight={unreadCount > 0 ? 700 : 600} fontSize={14} noWrap>
          {conv.otherUser?.username ?? 'Unknown'}
        </Typography>
        {conv.lastMessage && (
          <Typography variant="caption" color={unreadCount > 0 ? 'text.primary' : 'text.secondary'} fontWeight={unreadCount > 0 ? 600 : 400} noWrap>
            {conv.lastMessage.imageUrl && !conv.lastMessage.text ? '📷 Photo' : conv.lastMessage.text}
          </Typography>
        )}
      </Box>
      {conv.updatedAt && (
        <Typography variant="caption" color="text.secondary" flexShrink={0}>
          {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })}
        </Typography>
      )}
    </Stack>
  );
}

export function MessagesPage() {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const { isOnline } = useOnlineUsers();
  const { conversations, activeConvId, messages, loadingConvs, loadingMsgs, typingUsers } = useAppSelector((s) => s.messages);
  const token = useAppSelector((s) => s.auth.accessToken);
  const myId  = useAppSelector((s) => s.auth.user?.id);

  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const socketRef       = useRef<Socket | null>(null);
  const typingTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);

  const activeConv  = conversations.find((c) => c._id === activeConvId) ?? null;
  const otherUser   = activeConv?.otherUser ?? null;
  const otherOnline = otherUser ? isOnline(otherUser._id) : false;

  useEffect(() => { dispatch(fetchConversations()); }, [dispatch]);

  // Connect socket
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { path: '/messages.io/', auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('message:new', (msg) => dispatch(appendMessage(msg)));
    socket.on('typing:start', ({ userId }: { userId: string }) => dispatch(setTyping({ userId, typing: true })));
    socket.on('typing:stop',  ({ userId }: { userId: string }) => dispatch(setTyping({ userId, typing: false })));
    socket.on('conversation:updated', ({ conversationId, lastMessage }: { conversationId: string; lastMessage: unknown }) => {
      dispatch(upsertConversation({ _id: conversationId, lastMessage, updatedAt: new Date().toISOString() } as Conversation));
      dispatch(fetchConversations());
    });
    return () => { socket.disconnect(); };
  }, [token, dispatch]);

  // Join/leave conversation room
  useEffect(() => {
    if (!activeConvId) return;
    socketRef.current?.emit('conversation:join', activeConvId);
    dispatch(fetchMessages(activeConvId));
    return () => { socketRef.current?.emit('conversation:leave', activeConvId); };
  }, [activeConvId, dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSelectConv = useCallback((convId: string) => { dispatch(setActiveConv(convId)); }, [dispatch]);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const handleSend = async () => {
    if ((!input.trim() && !imageFile) || !activeConvId || sending) return;
    setSending(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        setUploading(true);
        const form = new FormData();
        form.append('image', imageFile);
        const res  = await apiFetch('/api/messages/upload', { method: 'POST', body: form });
        const data = await res.json();
        imageUrl = data.url as string;
        removeImage();
        setUploading(false);
      }
      const text = input.trim();
      setInput('');
      await dispatch(sendMessage({ convId: activeConvId, text, imageUrl })).unwrap();
    } catch { /* ignore */ } finally {
      setSending(false);
      setUploading(false);
    }
    socketRef.current?.emit('typing:stop', activeConvId);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (!activeConvId) return;
    socketRef.current?.emit('typing:start', activeConvId);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => { socketRef.current?.emit('typing:stop', activeConvId); }, 1500);
  };

  const showSidebar = !isMobile || !activeConvId;
  const showChat    = !isMobile || !!activeConvId;

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 120px)', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      {/* Conversation list */}
      {showSidebar && (
        <Box sx={{ width: isMobile ? '100%' : 300, borderRight: isMobile ? 'none' : '1px solid', borderColor: 'divider', overflowY: 'auto', flexShrink: 0 }}>
          <Typography fontWeight={700} p={2} fontSize={16}>Messages</Typography>
          <Divider />
          {loadingConvs && <Box textAlign="center" py={3}><CircularProgress size={24} /></Box>}
          {!loadingConvs && conversations.length === 0 && (
            <EmptyState icon={MessageIcon} title="No messages" description="Start a conversation from the Friends page" />
          )}
          {conversations.map((conv) => (
            <ConvItem key={conv._id} conv={conv} active={conv._id === activeConvId} onClick={() => handleSelectConv(conv._id)} />
          ))}
        </Box>
      )}

      {/* Chat area */}
      {showChat && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!activeConvId ? (
            <Box display="flex" alignItems="center" justifyContent="center" flex={1}>
              <EmptyState icon={MessageIcon} title="Select a conversation" description="Choose from the list to start chatting" />
            </Box>
          ) : (
            <>
              {/* Chat header */}
              <Stack direction="row" alignItems="center" spacing={1.5} px={2} py={1.5}
                sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                {isMobile && (
                  <IconButton size="small" onClick={() => dispatch(setActiveConv(null))}><ArrowBack /></IconButton>
                )}
                {otherUser ? (
                  <OnlineAvatar src={otherUser.avatar ?? undefined} username={otherUser.username} userId={otherUser._id} size={40} />
                ) : (
                  <Avatar sx={{ width: 40, height: 40 }}>?</Avatar>
                )}
                <Box>
                  <Typography fontWeight={600} fontSize={14}>{otherUser?.username ?? 'Chat'}</Typography>
                  {typingUsers.length > 0 ? (
                    <Typography variant="caption" color="primary.main" fontStyle="italic">typing…</Typography>
                  ) : (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Circle sx={{ fontSize: 9, color: otherOnline ? 'success.main' : 'text.disabled' }} />
                      <Typography variant="caption" color={otherOnline ? 'success.main' : 'text.secondary'}>
                        {otherOnline ? 'Online' : 'Offline'}
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </Stack>

              {/* Messages */}
              <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {loadingMsgs && <Box textAlign="center"><CircularProgress size={20} /></Box>}
                {messages.map((msg) => {
                  const isMe = msg.sender === myId;
                  return (
                    <Box key={msg._id} alignSelf={isMe ? 'flex-end' : 'flex-start'} sx={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 0.25 }}>
                      <Box sx={{ px: msg.imageUrl && !msg.text ? 0.5 : 2, py: msg.imageUrl && !msg.text ? 0.5 : 1, bgcolor: isMe ? 'primary.main' : 'action.hover', color: isMe ? 'primary.contrastText' : 'text.primary', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', overflow: 'hidden' }}>
                        {msg.imageUrl && (
                          <Box component="img" src={msg.imageUrl} alt="sent image"
                            sx={{ display: 'block', maxWidth: 260, maxHeight: 300, width: '100%', borderRadius: msg.text ? '12px 12px 0 0' : '14px', objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => window.open(msg.imageUrl!, '_blank')}
                          />
                        )}
                        {msg.text && (
                          <Box px={msg.imageUrl ? 1 : 0} pt={msg.imageUrl ? 0.5 : 0} pb={msg.imageUrl ? 0.5 : 0}>
                            <Typography fontSize={14}>{msg.text}</Typography>
                          </Box>
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ opacity: 0.55, px: 0.5 }}>
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </Typography>
                    </Box>
                  );
                })}
                <div ref={messagesEndRef} />
              </Box>

              {/* Image preview strip */}
              {imagePreview && (
                <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Box component="img" src={imagePreview} alt="preview"
                      sx={{ height: 80, width: 80, objectFit: 'cover', borderRadius: 2, display: 'block' }} />
                    <IconButton size="small" onClick={removeImage}
                      sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 0.25 }}>
                      <Close sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                </Box>
              )}

              {/* Input */}
              <Stack direction="row" spacing={1} p={1.5} alignItems="flex-end"
                sx={{ borderTop: imagePreview ? 'none' : '1px solid', borderColor: 'divider' }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagePick} />
                <IconButton size="small" color="primary" onClick={() => fileInputRef.current?.click()} disabled={!!imageFile}>
                  <ImageIcon />
                </IconButton>
                <TextField
                  fullWidth size="small" placeholder="Type a message…"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  multiline maxRows={4}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
                <IconButton color="primary" onClick={handleSend}
                  disabled={(!input.trim() && !imageFile) || sending || uploading}>
                  {uploading || sending ? <CircularProgress size={20} /> : <Send />}
                </IconButton>
              </Stack>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
