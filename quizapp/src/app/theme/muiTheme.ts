import { createTheme, type ThemeOptions } from '@mui/material/styles';
import type { ThemeMode } from '../types';

// Brand colours from the Meenzo logo
export const brand = {
  navy:      '#0F1B45',
  navyLight: '#1E2F6E',
  teal:      '#06D5CF',
  tealDeep:  '#047E7A', // teal dark enough for white text (≈4.9:1)
  ink:       '#0F0F0F',
};

const baseTokens = {
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

const getDesignTokens = (mode: ThemeMode): ThemeOptions => ({
  palette: {
    mode,
    // Light: navy buttons with white text. Dark: navy would vanish on the background,
    // so teal takes the lead with navy text.
    primary: mode === 'light'
      ? { main: brand.navy, light: brand.navyLight, dark: '#0A1230', contrastText: '#ffffff' }
      : { main: brand.teal, light: '#5BE7E3', dark: '#04B5B0', contrastText: brand.navy },
    secondary: mode === 'light'
      ? { main: brand.teal, dark: brand.tealDeep, contrastText: brand.navy }
      : { main: '#5BE7E3', dark: brand.teal, contrastText: brand.navy },
    success: { main: baseTokens.success },
    warning: { main: baseTokens.warning },
    error: { main: baseTokens.error },
    info: { main: baseTokens.info },
    background: {
      default: mode === 'light' ? '#F8F9FD' : '#0A0F1F',
      paper: mode === 'light' ? '#ffffff' : '#111936',
    },
    text: {
      primary: mode === 'light' ? brand.navy : '#E8ECF8',
      secondary: mode === 'light' ? '#5A6385' : '#9AA4C0',
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
          background: mode === 'light'
            ? `linear-gradient(135deg, ${brand.navy} 0%, ${brand.navyLight} 100%)`
            : `linear-gradient(135deg, ${brand.teal} 0%, #04B5B0 100%)`,
          // Without this the gradient hides MUI's grey disabled style and the label becomes unreadable
          '&.Mui-disabled': { background: 'none' },
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
          background: `linear-gradient(135deg, ${brand.navy}, ${brand.tealDeep})`,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&.Mui-selected': {
            backgroundColor: mode === 'light' ? `${brand.navy}12` : `${brand.teal}1F`,
            color: mode === 'light' ? brand.navy : brand.teal,
            '&:hover': { backgroundColor: mode === 'light' ? `${brand.navy}1F` : `${brand.teal}2E` },
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
    // Tab rows scroll sideways on narrow screens instead of cutting off the last tabs
    MuiTabs: {
      defaultProps: {
        variant: 'scrollable',
        scrollButtons: 'auto',
        allowScrollButtonsMobile: true,
      },
      styleOverrides: {
        scrollButtons: { '&.Mui-disabled': { opacity: 0.3 } },
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
