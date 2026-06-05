import { useState, useRef, useEffect } from 'react';
import {
  Box, Stack, Typography, TextField, IconButton, InputAdornment,
  Divider, Paper, useMediaQuery, useTheme, Chip,
} from '@mui/material';
import { Send, EmojiEmotions, AttachFile, ArrowBack } from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { sendMessage, setActiveChat } from '../../store/slices/messagesSlice';
import { ChatCard } from '../shared/ChatCard';
import { UserAvatar } from '../shared/UserAvatar';
import { currentUser } from '../../data/mockData';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from '../shared/EmptyState';
import { Message as MessageIcon } from '@mui/icons-material';

export function MessagesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const { chats, activeChatId } = useAppSelector((s) => s.messages);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages.length]);

  const handleSend = () => {
    if (!input.trim() || !activeChatId) return;
    dispatch(sendMessage({ chatId: activeChatId, content: input.trim() }));
    setInput('');
  };

  const showChatList = !isMobile || !activeChatId;
  const showChat = !isMobile || !!activeChatId;

  return (
    <Box sx={{ height: 'calc(100vh - 130px)', display: 'flex', gap: 2 }}>
      {/* Chat list */}
      {showChatList && (
        <Paper
          elevation={0}
          sx={{
            width: { xs: '100%', sm: 320 },
            flexShrink: 0,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700}>Messages</Typography>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
            {chats.map((chat) => <ChatCard key={chat.id} chat={chat} />)}
          </Box>
        </Paper>
      )}

      {/* Chat area */}
      {showChat && (
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {activeChat ? (
            <>
              {/* Chat Header */}
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  {isMobile && (
                    <IconButton size="small" onClick={() => dispatch(setActiveChat(''))}>
                      <ArrowBack />
                    </IconButton>
                  )}
                  <UserAvatar user={activeChat.participant} size={40} showOnline />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>{activeChat.participant.name}</Typography>
                    <Typography variant="caption" color={activeChat.participant.isOnline ? 'success.main' : 'text.secondary'}>
                      {activeChat.isTyping ? 'typing...' : activeChat.participant.isOnline ? 'Online' : 'Offline'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Messages */}
              <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {activeChat.messages.map((msg) => {
                  const isMine = msg.senderId === currentUser.id;
                  return (
                    <Stack key={msg.id} direction="row" justifyContent={isMine ? 'flex-end' : 'flex-start'}>
                      {!isMine && (
                        <UserAvatar user={activeChat.participant} size={28} sx={{ mr: 1, alignSelf: 'flex-end' }} />
                      )}
                      <Box sx={{ maxWidth: '70%' }}>
                        <Box
                          sx={{
                            px: 1.75, py: 1,
                            borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            bgcolor: isMine ? 'primary.main' : 'action.hover',
                            color: isMine ? 'white' : 'text.primary',
                          }}
                        >
                          <Typography variant="body2">{msg.content}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                          {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                        </Typography>
                      </Box>
                    </Stack>
                  );
                })}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input */}
              <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconButton size="small"><EmojiEmotions /></IconButton>
                  <IconButton size="small"><AttachFile /></IconButton>
                  <TextField
                    fullWidth
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }}
                  />
                  <IconButton
                    onClick={handleSend}
                    disabled={!input.trim()}
                    sx={{
                      bgcolor: 'primary.main', color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                      '&:disabled': { bgcolor: 'action.disabledBackground' },
                    }}
                  >
                    <Send fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            </>
          ) : (
            <EmptyState
              icon={MessageIcon}
              title="Select a conversation"
              description="Choose a chat from the list to start messaging."
            />
          )}
        </Paper>
      )}
    </Box>
  );
}
