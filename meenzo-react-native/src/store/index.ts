import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import posts from './slices/postsSlice';
import quiz from './slices/quizSlice';
import friends from './slices/friendsSlice';
import messages from './slices/messagesSlice';

export const store = configureStore({
  reducer: { auth, posts, quiz, friends, messages },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
