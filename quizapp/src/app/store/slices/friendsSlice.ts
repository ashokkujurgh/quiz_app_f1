import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { apiFetch } from '../../utils/apiFetch';

export interface FriendUser {
  _id: string;
  name: string;
  username: string;
  avatar: string | null;
  email: string;
}

export interface IncomingRequest {
  requestId: string;
  user: FriendUser;
  createdAt: string;
}

export interface OutgoingRequest {
  requestId: string;
  user: FriendUser;
  createdAt: string;
}

interface FriendsState {
  friends:   FriendUser[];
  incoming:  IncomingRequest[];
  outgoing:  OutgoingRequest[];
  suggestions: FriendUser[];
  loading:   boolean;
  error:     string | null;
}

const initialState: FriendsState = {
  friends: [], incoming: [], outgoing: [], suggestions: [], loading: false, error: null,
};

export const fetchFriends = createAsyncThunk('friends/fetchFriends', async () => {
  const res = await apiFetch('/api/friends');
  const data = await res.json();
  return data.data as FriendUser[];
});

export const fetchIncoming = createAsyncThunk('friends/fetchIncoming', async () => {
  const res = await apiFetch('/api/friends/requests/incoming');
  const data = await res.json();
  return data.data as IncomingRequest[];
});

export const fetchOutgoing = createAsyncThunk('friends/fetchOutgoing', async () => {
  const res = await apiFetch('/api/friends/requests/outgoing');
  const data = await res.json();
  return data.data as OutgoingRequest[];
});

export const fetchSuggestions = createAsyncThunk('friends/fetchSuggestions', async () => {
  const res = await apiFetch('/api/friends/suggestions');
  const data = await res.json();
  return data.data as FriendUser[];
});

export const sendFriendRequest = createAsyncThunk('friends/sendRequest', async (userId: string) => {
  await apiFetch(`/api/friends/request/${userId}`, { method: 'POST' });
  return userId;
});

export const acceptFriendRequest = createAsyncThunk('friends/accept', async (requestId: string) => {
  await apiFetch(`/api/friends/accept/${requestId}`, { method: 'POST' });
  return requestId;
});

export const declineFriendRequest = createAsyncThunk('friends/decline', async (requestId: string) => {
  await apiFetch(`/api/friends/decline/${requestId}`, { method: 'POST' });
  return requestId;
});

export const cancelFriendRequest = createAsyncThunk('friends/cancel', async (userId: string) => {
  await apiFetch(`/api/friends/cancel/${userId}`, { method: 'DELETE' });
  return userId;
});

export const unfriendUser = createAsyncThunk('friends/unfriend', async (userId: string) => {
  await apiFetch(`/api/friends/unfriend/${userId}`, { method: 'DELETE' });
  return userId;
});

const friendsSlice = createSlice({
  name: 'friends',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const loading = (state: FriendsState) => { state.loading = true; state.error = null; };
    const failed  = (state: FriendsState, action: PayloadAction<unknown>) => {
      state.loading = false;
      state.error   = (action.payload as string) ?? 'Error';
    };

    builder
      .addCase(fetchFriends.pending,    loading)
      .addCase(fetchFriends.fulfilled,  (state, a) => { state.loading = false; state.friends    = a.payload; })
      .addCase(fetchFriends.rejected,   failed)

      .addCase(fetchIncoming.pending,   loading)
      .addCase(fetchIncoming.fulfilled, (state, a) => { state.loading = false; state.incoming   = a.payload; })
      .addCase(fetchIncoming.rejected,  failed)

      .addCase(fetchOutgoing.pending,   loading)
      .addCase(fetchOutgoing.fulfilled, (state, a) => { state.loading = false; state.outgoing   = a.payload; })
      .addCase(fetchOutgoing.rejected,  failed)

      .addCase(fetchSuggestions.pending,   loading)
      .addCase(fetchSuggestions.fulfilled, (state, a) => { state.loading = false; state.suggestions = a.payload; })
      .addCase(fetchSuggestions.rejected,  failed)

      .addCase(sendFriendRequest.fulfilled, (state, a) => {
        state.suggestions = state.suggestions.filter((u) => u._id !== a.payload);
      })

      .addCase(acceptFriendRequest.fulfilled, (state, a) => {
        const req = state.incoming.find((r) => r.requestId === a.payload);
        if (req?.user) state.friends.push(req.user);
        state.incoming = state.incoming.filter((r) => r.requestId !== a.payload);
      })

      .addCase(declineFriendRequest.fulfilled, (state, a) => {
        state.incoming = state.incoming.filter((r) => r.requestId !== a.payload);
      })

      .addCase(cancelFriendRequest.fulfilled, (state, a) => {
        state.outgoing = state.outgoing.filter((r) => r.user._id !== a.payload);
      })

      .addCase(unfriendUser.fulfilled, (state, a) => {
        state.friends = state.friends.filter((f) => f._id !== a.payload);
      });
  },
});

export const { clearError } = friendsSlice.actions;
export default friendsSlice.reducer;
