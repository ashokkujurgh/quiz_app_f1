import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Chat, Message } from '../../types';
import { mockChats } from '../../data/mockData';
import { currentUser } from '../../data/mockData';

interface MessagesState {
  chats: Chat[];
  activeChatId: string | null;
}

const initialState: MessagesState = {
  chats: mockChats,
  activeChatId: null,
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setActiveChat: (state, action: PayloadAction<string>) => {
      state.activeChatId = action.payload;
      const chat = state.chats.find((c) => c.id === action.payload);
      if (chat) {
        chat.unreadCount = 0;
        chat.messages.forEach((m) => { m.read = true; });
      }
    },
    sendMessage: (state, action: PayloadAction<{ chatId: string; content: string }>) => {
      const chat = state.chats.find((c) => c.id === action.payload.chatId);
      if (chat) {
        const msg: Message = {
          id: `msg_${Date.now()}`,
          senderId: currentUser.id,
          content: action.payload.content,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'text',
        };
        chat.messages.push(msg);
        chat.lastMessage = msg;
      }
    },
  },
});

export const { setActiveChat, sendMessage } = messagesSlice.actions;
export default messagesSlice.reducer;
