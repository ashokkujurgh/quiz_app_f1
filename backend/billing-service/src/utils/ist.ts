// India Standard Time helpers. IST is a fixed UTC+05:30 offset (no daylight saving).
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** Calendar day in IST as 'YYYY-MM-DD'. */
export function istDay(date: Date = new Date()): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The instant the next IST day starts (when daily quotas reset). */
export function nextIstMidnight(date: Date = new Date()): Date {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(24, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}
