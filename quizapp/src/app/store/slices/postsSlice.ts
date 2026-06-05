import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Post, QuizTopic } from '../../types';
import { mockPosts } from '../../data/mockData';

interface PostsState {
  posts: Post[];
  activeTopic: QuizTopic;
  loading: boolean;
}

const initialState: PostsState = {
  posts: mockPosts,
  activeTopic: 'All',
  loading: false,
};

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    setActiveTopic: (state, action: PayloadAction<QuizTopic>) => {
      state.activeTopic = action.payload;
    },
    toggleLike: (state, action: PayloadAction<string>) => {
      const post = state.posts.find((p) => p.id === action.payload);
      if (post) {
        post.liked = !post.liked;
        post.likes += post.liked ? 1 : -1;
      }
    },
    toggleSave: (state, action: PayloadAction<string>) => {
      const post = state.posts.find((p) => p.id === action.payload);
      if (post) {
        post.saved = !post.saved;
      }
    },
    addPost: (state, action: PayloadAction<Post>) => {
      state.posts.unshift(action.payload);
    },
  },
});

export const { setActiveTopic, toggleLike, toggleSave, addPost } = postsSlice.actions;
export default postsSlice.reducer;
