import { useMemo, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { store } from './store';
import { router } from './router';
import { buildMuiTheme } from './theme/muiTheme';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { OnlineUsersProvider } from './context/OnlineUsersContext';
import { configureApiFetch } from './utils/apiFetch';
import { tokenRefreshed, logout } from './store/slices/authSlice';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

function ThemedApp() {
  const dispatch  = useAppDispatch();
  const themeMode = useAppSelector((s) => s.theme.mode);
  const theme     = useMemo(() => buildMuiTheme(themeMode), [themeMode]);

  useEffect(() => {
    configureApiFetch(
      () => store.getState().auth.accessToken,
      (newToken) => dispatch(tokenRefreshed(newToken)),
      () => dispatch(logout()),
    );
  }, [dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <OnlineUsersProvider>
          {/* MARKER-MAKE-KIT-INVOKED */}
          <RouterProvider router={router} />
        </OnlineUsersProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemedApp />
      </Provider>
    </ErrorBoundary>
  );
}
