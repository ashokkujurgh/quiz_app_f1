export const colors = {
  background: '#f5f4fc',
  foreground: '#16132e',
  card: '#ffffff',
  primary: '#7c5cfc',
  primaryForeground: '#ffffff',
  secondary: '#ede9ff',
  secondaryForeground: '#16132e',
  // Darker than the original mockup's #8a84a8 — that shade reads at ~2.5:1 contrast against
  // white/card backgrounds (below WCAG AA), which made secondary labels like inactive tabs
  // nearly illegible on an actual device screen. This still reads as "muted purple-gray" but
  // clears ~4.5:1.
  mutedForeground: '#6f6a8c',
  accent: '#e040fb',
  destructive: '#d4183d',
  border: 'rgba(124,92,252,0.1)',
  borderStrong: 'rgba(124,92,252,0.15)',
  inputBackground: '#ede9ff',
  switchBackgroundOff: 'rgba(22,19,46,0.1)',
  chipBorder: 'rgba(124,92,252,0.12)',
  chipInactiveText: 'rgba(22,19,46,0.45)',
  iconInactive: 'rgba(22,19,46,0.3)',
  actionPillBg: 'rgba(22,19,46,0.04)',
  softPrimaryBg: 'rgba(124,92,252,0.08)',
  softPrimaryBg15: 'rgba(124,92,252,0.15)',
  likedBg: 'rgba(224,64,251,0.1)',
  savedBg: 'rgba(124,92,252,0.15)',
  addedBg: 'rgba(34,197,94,0.15)',
  addedBorder: 'rgba(74,222,128,0.3)',
  addedText: '#4ade80',
  online: '#4ade80',
  liveBadgeBg: 'rgba(34,197,94,0.25)',
  liveBadgeBorder: 'rgba(74,222,128,0.4)',
  liveBadgeText: '#16a34a',
  endedBadgeBg: 'rgba(0,0,0,0.35)',
  endedBadgeBorder: 'rgba(22,19,46,0.15)',
  // Was rgba(22,19,46,0.6) — dark text on this dark translucent badge over the purple
  // gradient cover was nearly unreadable on-device. Light text on a dark pill reads correctly.
  endedBadgeText: 'rgba(255,255,255,0.9)',
  white: '#ffffff',
  white35: 'rgba(255,255,255,0.35)',
  white40: 'rgba(255,255,255,0.4)',
  white60: 'rgba(255,255,255,0.6)',
  black: '#000000',
} as const;

export const avatarColors: Record<string, string> = {
  M: '#7c5cfc',
  A: '#e040fb',
  P: '#06b6d4',
  R: '#22c55e',
  S: '#f59e0b',
  K: '#ef4444',
  V: '#3b82f6',
  D: '#14b8a6',
  N: '#f97316',
};

export function colorForInitial(name: string): string {
  const initial = name?.[0]?.toUpperCase() ?? 'M';
  return avatarColors[initial] ?? colors.primary;
}
