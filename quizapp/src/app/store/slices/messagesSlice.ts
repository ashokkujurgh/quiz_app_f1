import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { apiFetch } from '../../utils/apiFetch';

export interface MsgUser {
  _id: string;
  username: string;
  avatar: string | null;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: string;
  text: string;
  imageUrl: string | null;
  readBy: string[];
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: string[];
  lastMessage: Message | null;
  otherUser: MsgUser | null;
  updatedAt: string;
}

interface MessagesState {
  conversations:     Conversation[];
  activeConvId:      string | null;
  messages:          Message[];
  loadingConvs:      boolean;
  loadingMsgs:       boolean;
  typingUsers:       string[];
  unreadByConv:      Record<string, number>;
  error:             string | null;
}

const initialState: MessagesState = {
  conversations: [], activeConvId: null, messages: [],
  loadingConvs: false, loadingMsgs: false, typingUsers: [],
  unreadByConv: {}, error: null,
};

export const fetchConversations = createAsyncThunk('messages/fetchConversations', async () => {
  const res = await apiFetch('/api/messages/conversations');
  const data = await res.json();
  return data.data as Conversation[];
});

export const openConversation = createAsyncThunk('messages/openConversation', async (userId: string) => {
  const res = await apiFetch(`/api/messages/conversations/${userId}`, { method: 'POST' });
  const data = await res.json();
  return data.data as Conversation & { otherUser: MsgUser };
});

export const fetchMessages = createAsyncThunk('messages/fetchMessages', async (convId: string) => {
  const res = await apiFetch(`/api/messages/conversations/${convId}`);
  const data = await res.json();
  return { convId, messages: data.data as Message[] };
});

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async ({ convId, text, imageUrl }: { convId: string; text: string; imageUrl?: string }) => {
    const res = await apiFetch(`/api/messages/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, imageUrl }),
    });
    const data = await res.json();
    return data.data as Message;
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setActiveConv: (state, action: PayloadAction<string | null>) => {
      state.activeConvId = action.payload;
      state.messages     = [];
      state.typingUsers  = [];
      // Clear unread for this conversation when opened
      if (action.payload) state.unreadByConv[action.payload] = 0;
    },
    appendMessage: (state, action: PayloadAction<Message>) => {
      const msg     = action.payload;
      const convId  = msg.conversation;
      if (!state.messages.find((m) => m._id === msg._id)) {
        state.messages.push(msg);
      }
      // Update lastMessage in conversation list
      const conv = state.conversations.find((c) => c._id === convId);
      if (conv) { conv.lastMessage = msg; conv.updatedAt = msg.createdAt; }
      // Increment unread if the message is not in the currently viewed conversation
      if (convId !== state.activeConvId) {
        state.unreadByConv[convId] = (state.unreadByConv[convId] ?? 0) + 1;
      }
    },
    setTyping: (state, action: PayloadAction<{ userId: string; typing: boolean }>) => {
      const { userId, typing } = action.payload;
      if (typing && !state.typingUsers.includes(userId)) state.typingUsers.push(userId);
      if (!typing) state.typingUsers = state.typingUsers.filter((id) => id !== userId);
    },
    upsertConversation: (state, action: PayloadAction<Conversation>) => {
      const idx = state.conversations.findIndex((c) => c._id === action.payload._id);
      if (idx >= 0) state.conversations[idx] = action.payload;
      else state.conversations.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending,  (state) => { state.loadingConvs = true; })
      .addCase(fetchConversations.fulfilled, (state, a) => { state.loadingConvs = false; state.conversations = a.payload; })
      .addCase(fetchConversations.rejected,  (state) => { state.loadingConvs = false; })

      .addCase(openConversation.fulfilled, (state, a) => {
        const idx = state.conversations.findIndex((c) => c._id === a.payload._id);
        if (idx < 0) state.conversations.unshift(a.payload);
        state.activeConvId = a.payload._id;
        state.messages     = [];
        state.unreadByConv[a.payload._id] = 0;
      })

      .addCase(fetchMessages.pending,   (state) => { state.loadingMsgs = true; })
      .addCase(fetchMessages.fulfilled, (state, a) => {
        state.loadingMsgs  = false;
        state.messages     = a.payload.messages;
        state.activeConvId = a.payload.convId;
        state.unreadByConv[a.payload.convId] = 0;
      })
      .addCase(fetchMessages.rejected,  (state) => { state.loadingMsgs = false; })

      .addCase(sendMessage.fulfilled, (state, a) => {
        if (!state.messages.find((m) => m._id === a.payload._id)) {
          state.messages.push(a.payload);
        }
      });
  },
});

export const { setActiveConv, appendMessage, setTyping, upsertConversation } = messagesSlice.actions;
export default messagesSlice.reducer;
