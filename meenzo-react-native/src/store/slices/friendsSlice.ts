import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as friendsApi from '../../api/services/friends';
import { dedupeById } from '../../utils/dedupe';
import type { FriendUser, FriendRequest } from '../../types';

interface FriendsState {
  friends: FriendUser[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  suggestions: FriendUser[];
  loading: boolean;
  error: string | null;
}

const initialState: FriendsState = {
  friends: [],
  incoming: [],
  outgoing: [],
  suggestions: [],
  loading: false,
  error: null,
};

export const fetchFriends = createAsyncThunk('friends/fetchFriends', async () => {
  const res = await friendsApi.fetchFriends();
  return res.data;
});

export const fetchIncoming = createAsyncThunk('friends/fetchIncoming', async () => {
  const res = await friendsApi.fetchIncoming();
  return res.data;
});

export const fetchOutgoing = createAsyncThunk('friends/fetchOutgoing', async () => {
  const res = await friendsApi.fetchOutgoing();
  return res.data;
});

export const fetchSuggestions = createAsyncThunk('friends/fetchSuggestions', async () => {
  const res = await friendsApi.fetchSuggestions();
  return res.data;
});

export const fetchAllFriendData = createAsyncThunk('friends/fetchAll', async (_: void, { dispatch }) => {
  await Promise.all([
    dispatch(fetchFriends()),
    dispatch(fetchIncoming()),
    dispatch(fetchOutgoing()),
    dispatch(fetchSuggestions()),
  ]);
});

export const sendFriendRequest = createAsyncThunk('friends/send', async (userId: string, { dispatch }) => {
  await friendsApi.sendRequest(userId);
  await dispatch(fetchOutgoing());
  await dispatch(fetchSuggestions());
  return userId;
});

export const acceptFriendRequest = createAsyncThunk(
  'friends/accept',
  async (requestId: string, { dispatch }) => {
    await friendsApi.acceptRequest(requestId);
    await dispatch(fetchFriends());
    await dispatch(fetchIncoming());
    return requestId;
  },
);

export const declineFriendRequest = createAsyncThunk(
  'friends/decline',
  async (requestId: string, { dispatch }) => {
    await friendsApi.declineRequest(requestId);
    await dispatch(fetchIncoming());
    return requestId;
  },
);

export const cancelFriendRequest = createAsyncThunk('friends/cancel', async (userId: string, { dispatch }) => {
  await friendsApi.cancelRequest(userId);
  await dispatch(fetchOutgoing());
  return userId;
});

export const unfriendUser = createAsyncThunk('friends/unfriend', async (userId: string, { dispatch }) => {
  await friendsApi.unfriend(userId);
  await dispatch(fetchFriends());
  return userId;
});

const friendsSlice = createSlice({
  name: 'friends',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFriends.fulfilled, (state, action) => {
        state.friends = dedupeById(action.payload, (f) => f?._id);
      })
      .addCase(fetchIncoming.fulfilled, (state, action) => {
        state.incoming = dedupeById(action.payload, (r) => r?.user?._id).filter((r) => !!r.user);
      })
      .addCase(fetchOutgoing.fulfilled, (state, action) => {
        state.outgoing = dedupeById(action.payload, (r) => r?.user?._id).filter((r) => !!r.user);
      })
      .addCase(fetchSuggestions.fulfilled, (state, action) => {
        state.suggestions = dedupeById(action.payload, (f) => f?._id);
      })
      .addCase(fetchAllFriendData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllFriendData.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(fetchAllFriendData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load friends';
      });
  },
});

export default friendsSlice.reducer;
