const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Short relative time: "just now", "5m ago", "3h ago", "2d ago", "3w ago", then a date. */
export function timeAgo(iso: string | number | null | undefined, now: number = Date.now()): string {
  if (iso == null) return 'never';
  const t = typeof iso === 'number' ? iso : Date.parse(iso);
  if (Number.isNaN(t)) return 'unknown';
  const diff = Math.max(0, now - t);
  if (diff < MIN) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  if (diff < 35 * DAY) return `${Math.floor(diff / (7 * DAY))}w ago`;
  return formatDate(t, now);
}

export function formatDate(iso: string | number, now: number = Date.now()): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string | number): string {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

/** "in 12 min" style countdown for rate-limit resets. */
export function timeUntil(epochMs: number, now: number = Date.now()): string {
  const diff = epochMs - now;
  if (diff <= 0) return 'now';
  if (diff < HOUR) return `${Math.max(1, Math.ceil(diff / MIN))} min`;
  return `${Math.ceil(diff / HOUR)} h`;
}

/** Format a calendar date string ("2026-03-04") without timezone drift. */
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
