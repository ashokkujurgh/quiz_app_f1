import { useMemo } from 'react';
import { RouterProvider } from 'react-router';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { store } from './store';
import { router } from './router';
import { buildMuiTheme } from './theme/muiTheme';
import { useAppSelector } from './store/hooks';
import { OnlineUsersProvider } from './context/OnlineUsersContext';

function ThemedApp() {
  const themeMode = useAppSelector((s) => s.theme.mode);
  const theme = useMemo(() => buildMuiTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <OnlineUsersProvider>
        {/* MARKER-MAKE-KIT-INVOKED */}
        <RouterProvider router={router} />
      </OnlineUsersProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemedApp />
    </Provider>
  );
}
