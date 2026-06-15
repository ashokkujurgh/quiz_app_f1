import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types';
import { currentUser } from '../../data/mockData';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const storedUser = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem('auth_user') ?? 'null') as (User & { _id?: string }) | null;
    if (!raw) return null;
    return { ...raw, id: raw.id ?? raw._id ?? '' } as User;
  } catch { return null; }
})();

const initialState: AuthState = {
  user: storedUser,
  accessToken: localStorage.getItem('access_token'),
  isAuthenticated: !!storedUser,
  loading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ email: string; password: string }>) => {
      state.user = currentUser;
      state.isAuthenticated = true;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User & { _id?: string }; accessToken: string }>) => {
      const raw = action.payload.user;
      const user: User = { ...raw, id: raw.id ?? raw._id ?? '' };
      state.user = user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      localStorage.setItem('access_token', action.payload.accessToken);
      localStorage.setItem('auth_user', JSON.stringify(user));
    },
    signup: (state, action: PayloadAction<Partial<User>>) => {
      state.user = { ...currentUser, ...action.payload };
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    tokenRefreshed: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      localStorage.setItem('access_token', action.payload);
    },
  },
});

export const { login, loginSuccess, signup, logout, updateUser, tokenRefreshed } = authSlice.actions;
export default authSlice.reducer;
