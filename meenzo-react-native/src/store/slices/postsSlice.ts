import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as postsApi from '../../api/services/posts';
import { dedupeById } from '../../utils/dedupe';
import type { Post } from '../../types';

interface PostsState {
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: PostsState = {
  posts: [],
  loading: false,
  refreshing: false,
  error: null,
};

export const fetchFeed = createAsyncThunk(
  'posts/fetchFeed',
  async (params: { topic?: string; subTopic?: string; q?: string; limit?: number } = {}) => {
    const res = await postsApi.fetchFeed(params);
    return res.posts;
  },
);

export const createPost = createAsyncThunk('posts/createPost', async (body: postsApi.CreatePostBody) => {
  const res = await postsApi.createPost(body);
  return res.post;
});

export const toggleLike = createAsyncThunk('posts/toggleLike', async (postId: string) => {
  const res = await postsApi.toggleLike(postId);
  return res.post;
});

export const toggleSave = createAsyncThunk('posts/toggleSave', async (postId: string) => {
  const res = await postsApi.toggleSave(postId);
  return res.post;
});

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    likeOptimistic(state, action: PayloadAction<string>) {
      const p = state.posts.find((x) => x._id === action.payload);
      if (p) {
        p.liked = !p.liked;
        p.likes = (p.likes ?? 0) + (p.liked ? 1 : -1);
      }
    },
    saveOptimistic(state, action: PayloadAction<string>) {
      const p = state.posts.find((x) => x._id === action.payload);
      if (p) p.saved = !p.saved;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeed.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = dedupeById(action.payload, (p) => p?._id);
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load feed';
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.posts.unshift(action.payload);
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        const idx = state.posts.findIndex((p) => p._id === action.payload._id);
        if (idx >= 0) state.posts[idx] = action.payload;
      })
      .addCase(toggleSave.fulfilled, (state, action) => {
        const idx = state.posts.findIndex((p) => p._id === action.payload._id);
        if (idx >= 0) state.posts[idx] = action.payload;
      });
  },
});

export const { likeOptimistic, saveOptimistic } = postsSlice.actions;
export default postsSlice.reducer;
