import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as authApi from '../../api/services/auth';
import { saveAccessToken, saveStoredUser, getAccessToken, clearAuthStorage } from '../../utils/secureStorage';
import type { User } from '../../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  bootstrapped: boolean;
  authError: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: false,
  bootstrapped: false,
  authError: null,
};

export const login = createAsyncThunk('auth/login', async ({ email, password }: { email: string; password: string }) => {
  const res = await authApi.login(email, password);
  await saveAccessToken(res.accessToken);
  await saveStoredUser(JSON.stringify(res.user));
  return res;
});

export const register = createAsyncThunk(
  'auth/register',
  async ({ name, email, password }: { name: string; email: string; password: string }) => {
    return authApi.register(name, email, password);
  },
);

export const hydrateFromStorage = createAsyncThunk('auth/hydrate', async (_: void, { rejectWithValue }) => {
  const token = await getAccessToken();
  if (!token) return rejectWithValue('no-token');
  try {
    const res = await authApi.me();
    await saveStoredUser(JSON.stringify(res.user));
    return { accessToken: token, user: res.user };
  } catch {
    const refreshed = await authApi.refresh().catch(() => null);
    if (refreshed) {
      await saveAccessToken(refreshed.accessToken);
      await saveStoredUser(JSON.stringify(refreshed.user));
      return { accessToken: refreshed.accessToken, user: refreshed.user };
    }
    await clearAuthStorage();
    return rejectWithValue('hydrate-failed');
  }
});

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await authApi.logout().catch(() => undefined);
  await clearAuthStorage();
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (patch: { name?: string; username?: string; bio?: string }) => {
    const res = await authApi.updateProfile(patch);
    await saveStoredUser(JSON.stringify(res.user));
    return res.user;
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    tokenRefreshed(state, action: PayloadAction<{ token: string; user?: User }>) {
      state.accessToken = action.payload.token;
      if (action.payload.user) state.user = action.payload.user;
    },
    forceLogout(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.authError = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.authError = action.error.message ?? 'Login failed';
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.authError = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.authError = action.error.message ?? 'Registration failed';
      })
      .addCase(hydrateFromStorage.pending, (state) => {
        state.loading = true;
      })
      .addCase(hydrateFromStorage.fulfilled, (state, action) => {
        state.loading = false;
        state.bootstrapped = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(hydrateFromStorage.rejected, (state) => {
        state.loading = false;
        state.bootstrapped = true;
        state.isAuthenticated = false;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { tokenRefreshed, forceLogout, setUser } = authSlice.actions;
export default authSlice.reducer;
