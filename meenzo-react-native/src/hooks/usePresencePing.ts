import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as authApi from '../api/services/auth';
import { useAppSelector } from '../store/hooks';

/** Pings /api/auth/online|offline as the app foregrounds/backgrounds. */
export function usePresencePing() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    authApi.setOnline().catch(() => undefined);

    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        authApi.setOnline().catch(() => undefined);
      } else {
        authApi.setOffline().catch(() => undefined);
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => {
      sub.remove();
      authApi.setOffline().catch(() => undefined);
    };
  }, [isAuthenticated]);
}
