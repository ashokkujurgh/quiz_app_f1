import { createTheme, type ThemeOptions } from '@mui/material/styles';
import type { ThemeMode } from '../types';

const baseTokens = {
  primary: '#5563DE',
  primaryDark: '#3d4dcc',
  secondary: '#E91E8C',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

const getDesignTokens = (mode: ThemeMode): ThemeOptions => ({
  palette: {
    mode,
    primary: { main: baseTokens.primary, dark: baseTokens.primaryDark },
    secondary: { main: baseTokens.secondary },
    success: { main: baseTokens.success },
    warning: { main: baseTokens.warning },
    error: { main: baseTokens.error },
    info: { main: baseTokens.info },
    background: {
      default: mode === 'light' ? '#f0f2f5' : '#0d1117',
      paper: mode === 'light' ? '#ffffff' : '#161b22',
    },
    text: {
      primary: mode === 'light' ? '#1a1a2e' : '#e6edf3',
      secondary: mode === 'light' ? '#57606a' : '#8b949e',
    },
    divider: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${baseTokens.primary} 0%, ${baseTokens.primaryDark} 100%)`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: mode === 'light' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : '0 1px 3px rgba(0,0,0,0.4)',
          border: mode === 'light' ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${baseTokens.primary}, ${baseTokens.secondary})`,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&.Mui-selected': {
            backgroundColor: `${baseTokens.primary}18`,
            color: baseTokens.primary,
            '&:hover': { backgroundColor: `${baseTokens.primary}25` },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: mode === 'light' ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
  },
});

export const buildMuiTheme = (mode: ThemeMode) => createTheme(getDesignTokens(mode));
