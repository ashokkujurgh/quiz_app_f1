/** Tailwind's 4px base unit, matching the web mockup's spacing scale (px-5 = 20, gap-2 = 8, ...). */
export function sp(n: number): number {
  return n * 4;
}

export const radius = {
  sm: 12,
  md: 16,
  lg: 18,
  xl: 22,
  full: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#7c5cfc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  fab: {
    shadowColor: '#7c5cfc',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;
