import { useMemo } from 'react';
import { RouterProvider } from 'react-router';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { store } from './store';
import { router } from './router';
import { buildMuiTheme } from './theme/muiTheme';
import { useAppSelector } from './store/hooks';

function ThemedApp() {
  const themeMode = useAppSelector((s) => s.theme.mode);
  const theme = useMemo(() => buildMuiTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* MARKER-MAKE-KIT-INVOKED */}
      <RouterProvider router={router} />
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
