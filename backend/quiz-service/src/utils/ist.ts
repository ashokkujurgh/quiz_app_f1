// IST (UTC+05:30, no daylight saving) calendar day as 'YYYY-MM-DD'
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export function istDay(date: Date = new Date()): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}
