import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { io } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchConversations } from '../store/slices/messagesSlice';

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

// Keeps the unread-message badges (top bar, sidebar, bottom nav) current on every page.
// The counts come from the conversation list, which only the Messages page used to load.
// On a new message we re-fetch the server's counts rather than adding to them, so nothing is
// counted twice. The Messages page runs its own socket and fetches, so we stay out of its way there.
export const useUnreadMessages = () => {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.accessToken);
  const onMessagesPage = useLocation().pathname.startsWith('/messages');

  useEffect(() => {
    if (!token || onMessagesPage) return;
    dispatch(fetchConversations());
    const socket = io(SOCKET_URL, { path: '/messages.io/', auth: { token }, transports: ['websocket', 'polling'] });
    const refresh = () => { dispatch(fetchConversations()); };
    socket.on('message:new', refresh);
    socket.on('conversation:updated', refresh);
    return () => { socket.disconnect(); };
  }, [token, onMessagesPage, dispatch]);
};
