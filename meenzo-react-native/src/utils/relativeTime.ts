import { formatDistanceToNowStrict } from 'date-fns';

/** "2h ago", "1d ago" — mirrors the mockup's compact relative-time style. */
export function relativeTime(iso: string | undefined): string {
  if (!iso) return '';
  try {
    return `${formatDistanceToNowStrict(new Date(iso))} ago`;
  } catch {
    return '';
  }
}
