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
  try { return JSON.parse(localStorage.getItem('auth_user') ?? 'null') as User | null; }
  catch { return null; }
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
    loginSuccess: (state, action: PayloadAction<{ user: User; accessToken: string }>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      localStorage.setItem('access_token', action.payload.accessToken);
      localStorage.setItem('auth_user', JSON.stringify(action.payload.user));
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
  },
});

export const { login, loginSuccess, signup, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
