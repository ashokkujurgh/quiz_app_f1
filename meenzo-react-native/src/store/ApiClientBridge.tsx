import { useEffect } from 'react';
import { configureApiClient } from '../api/apiClient';
import { saveAccessToken } from '../utils/secureStorage';
import { store } from './index';
import { tokenRefreshed, forceLogout } from './slices/authSlice';

/** Wires the plain-JS apiClient module to the Redux store. Mount once at app root. */
export default function ApiClientBridge() {
  useEffect(() => {
    configureApiClient(
      () => store.getState().auth.accessToken,
      (token, user) => {
        store.dispatch(tokenRefreshed({ token, user: user as any }));
        saveAccessToken(token).catch(() => undefined);
      },
      () => store.dispatch(forceLogout()),
    );
  }, []);
  return null;
}
