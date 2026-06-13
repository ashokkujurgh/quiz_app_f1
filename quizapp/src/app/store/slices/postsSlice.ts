import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Post, QuizTopic } from '../../types';

interface PostsState {
  posts: Post[];
  activeTopic: QuizTopic;
  loading: boolean;
}

const initialState: PostsState = {
  posts: [],
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
    syncLike: (state, action: PayloadAction<{ id: string; liked: boolean; likes: number }>) => {
      const post = state.posts.find((p) => p.id === action.payload.id);
      if (post) {
        post.liked = action.payload.liked;
        post.likes = action.payload.likes;
      }
    },
    incrementComments: (state, action: PayloadAction<string>) => {
      const post = state.posts.find((p) => p.id === action.payload);
      if (post) post.comments += 1;
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
    setPosts: (state, action: PayloadAction<Post[]>) => {
      state.posts = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setActiveTopic, toggleLike, syncLike, toggleSave, addPost, setPosts, setLoading, incrementComments } = postsSlice.actions;
export default postsSlice.reducer;
