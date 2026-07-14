import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../api/apiClient';
import { useAppDispatch } from '../store/hooks';
import { appendMessage, setTyping, upsertConversation, fetchConversations } from '../store/slices/messagesSlice';
import type { Conversation, Message } from '../types';

export function useMessagesSocket(token: string | null) {
  const dispatch = useAppDispatch();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;
    const socket = io(API_BASE, {
      path: '/messages.io/',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('message:new', (msg: Message) => dispatch(appendMessage(msg)));
    socket.on('typing:start', ({ userId }: { userId: string }) => dispatch(setTyping({ userId, typing: true })));
    socket.on('typing:stop', ({ userId }: { userId: string }) => dispatch(setTyping({ userId, typing: false })));
    socket.on(
      'conversation:updated',
      ({ conversationId, lastMessage }: { conversationId: string; lastMessage: Conversation['lastMessage'] }) => {
        dispatch(
          upsertConversation({
            _id: conversationId,
            lastMessage,
            updatedAt: new Date().toISOString(),
          } as Conversation),
        );
        dispatch(fetchConversations());
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, dispatch]);

  const joinConversation = (conversationId: string) => socketRef.current?.emit('conversation:join', conversationId);
  const leaveConversation = (conversationId: string) => socketRef.current?.emit('conversation:leave', conversationId);
  const startTyping = (conversationId: string) => socketRef.current?.emit('typing:start', conversationId);
  const stopTyping = (conversationId: string) => socketRef.current?.emit('typing:stop', conversationId);

  return { joinConversation, leaveConversation, startTyping, stopTyping };
}
