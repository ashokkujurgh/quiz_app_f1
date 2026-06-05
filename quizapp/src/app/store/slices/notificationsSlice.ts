import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '../../types';
import { mockNotifications } from '../../data/mockData';

interface NotificationsState {
  notifications: Notification[];
}

const initialState: NotificationsState = {
  notifications: mockNotifications,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    markRead: (state, action: PayloadAction<string>) => {
      const n = state.notifications.find((n) => n.id === action.payload);
      if (n) n.read = true;
    },
    markAllRead: (state) => {
      state.notifications.forEach((n) => { n.read = true; });
    },
  },
});

export const { markRead, markAllRead } = notificationsSlice.actions;
export default notificationsSlice.reducer;
