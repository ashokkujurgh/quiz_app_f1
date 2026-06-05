import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Friend } from '../../types';
import { mockFriends } from '../../data/mockData';

interface FriendsState {
  friends: Friend[];
}

const initialState: FriendsState = {
  friends: mockFriends,
};

const friendsSlice = createSlice({
  name: 'friends',
  initialState,
  reducers: {
    acceptRequest: (state, action: PayloadAction<string>) => {
      const friend = state.friends.find((f) => f.id === action.payload);
      if (friend) friend.status = 'friend';
    },
    rejectRequest: (state, action: PayloadAction<string>) => {
      state.friends = state.friends.filter((f) => f.id !== action.payload);
    },
    sendRequest: (state, action: PayloadAction<string>) => {
      const friend = state.friends.find((f) => f.id === action.payload);
      if (friend) friend.status = 'pending_sent';
    },
    cancelRequest: (state, action: PayloadAction<string>) => {
      const friend = state.friends.find((f) => f.id === action.payload);
      if (friend) friend.status = 'suggested';
    },
    unfriend: (state, action: PayloadAction<string>) => {
      state.friends = state.friends.filter((f) => f.id !== action.payload);
    },
  },
});

export const { acceptRequest, rejectRequest, sendRequest, cancelRequest, unfriend } = friendsSlice.actions;
export default friendsSlice.reducer;
