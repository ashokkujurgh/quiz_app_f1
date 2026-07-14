import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as messagesApi from '../../api/services/messages';
import { dedupeById } from '../../utils/dedupe';
import type { Conversation, Message } from '../../types';

interface MessagesState {
  conversations: Conversation[];
  activeConvId: string | null;
  messages: Message[];
  loadingConvs: boolean;
  loadingMsgs: boolean;
  typingUsers: string[];
  unreadByConv: Record<string, number>;
  error: string | null;
}

const initialState: MessagesState = {
  conversations: [],
  activeConvId: null,
  messages: [],
  loadingConvs: false,
  loadingMsgs: false,
  typingUsers: [],
  unreadByConv: {},
  error: null,
};

export const fetchConversations = createAsyncThunk('messages/fetchConversations', async () => {
  const res = await messagesApi.fetchConversations();
  return res.data;
});

export const openConversation = createAsyncThunk('messages/openConversation', async (userId: string) => {
  const res = await messagesApi.openConversation(userId);
  return res.data;
});

export const fetchMessages = createAsyncThunk('messages/fetchMessages', async (conversationId: string) => {
  const res = await messagesApi.fetchMessages(conversationId);
  return { conversationId, messages: res.data };
});

export const markConvRead = createAsyncThunk('messages/markRead', async (conversationId: string) => {
  await messagesApi.markRead(conversationId);
  return conversationId;
});

export const sendMessage = createAsyncThunk(
  'messages/send',
  async ({ conversationId, text, imageUrl }: { conversationId: string; text?: string; imageUrl?: string }) => {
    const res = await messagesApi.sendMessage(conversationId, text, imageUrl);
    return res.data;
  },
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setActiveConv(state, action: PayloadAction<string | null>) {
      state.activeConvId = action.payload;
      if (action.payload) state.unreadByConv[action.payload] = 0;
    },
    appendMessage(state, action: PayloadAction<Message>) {
      const msg = action.payload;
      if (msg.conversation === state.activeConvId) {
        state.messages.push(msg);
      } else {
        state.unreadByConv[msg.conversation] = (state.unreadByConv[msg.conversation] ?? 0) + 1;
      }
      const conv = state.conversations.find((c) => c._id === msg.conversation);
      if (conv) {
        conv.lastMessage = { _id: msg._id, text: msg.text, createdAt: msg.createdAt };
        conv.updatedAt = msg.createdAt;
      }
    },
    setTyping(state, action: PayloadAction<{ userId: string; typing: boolean }>) {
      const { userId, typing } = action.payload;
      state.typingUsers = typing
        ? Array.from(new Set([...state.typingUsers, userId]))
        : state.typingUsers.filter((id) => id !== userId);
    },
    upsertConversation(state, action: PayloadAction<Conversation>) {
      const idx = state.conversations.findIndex((c) => c._id === action.payload._id);
      if (idx >= 0) state.conversations[idx] = action.payload;
      else state.conversations.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loadingConvs = true;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loadingConvs = false;
        state.conversations = dedupeById(action.payload, (c) => c?._id);
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loadingConvs = false;
        state.error = action.error.message ?? 'Failed to load conversations';
      })
      .addCase(openConversation.fulfilled, (state, action) => {
        const idx = state.conversations.findIndex((c) => c._id === action.payload._id);
        if (idx < 0) state.conversations.unshift(action.payload);
      })
      .addCase(fetchMessages.pending, (state) => {
        state.loadingMsgs = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loadingMsgs = false;
        state.messages = action.payload.messages;
      })
      .addCase(fetchMessages.rejected, (state) => {
        state.loadingMsgs = false;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.messages.push(action.payload);
      });
  },
});

export const { setActiveConv, appendMessage, setTyping, upsertConversation } = messagesSlice.actions;
export default messagesSlice.reducer;
