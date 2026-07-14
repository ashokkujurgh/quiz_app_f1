/** "30 -> 30 min", "300 -> 5h", "330 -> 5h 30m" — matches the web app's formatDuration(). */
export function formatDuration(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
