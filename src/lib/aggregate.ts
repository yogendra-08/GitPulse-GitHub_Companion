import type { ContributionDay, SearchItem } from '@/shared/types';
import type { ActivityItem, ActivityKind } from './activity';
import { KIND_LABELS } from './activity';

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Events per UTC day for the last `days` days (zero-filled so gaps are visible). */
export function eventsByDay(items: ActivityItem[], days: number, now: number = Date.now()): ContributionDay[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    const d = it.at.slice(0, 10);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const out: ContributionDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = isoDay(now - i * 86_400_000);
    out.push({ date: d, count: counts.get(d) ?? 0 });
  }
  return out;
}

export function eventMix(items: ActivityItem[]): { kind: ActivityKind; label: string; count: number }[] {
  const counts = new Map<ActivityKind, number>();
  for (const it of items) counts.set(it.kind, (counts.get(it.kind) ?? 0) + 1);
  return [...counts.entries()]
    .map(([kind, count]) => ({ kind, label: KIND_LABELS[kind], count }))
    .sort((a, b) => b.count - a.count);
}

export interface ContributionStats {
  total: number;
  activeDays: number;
  longestStreak: number;
  currentStreak: number;
  busiest: ContributionDay | null;
}

/** Streaks and totals from a calendar. Days after `today` (the rest of this week) are ignored. */
export function contributionStats(days: ContributionDay[], today: string = isoDay(Date.now())): ContributionStats {
  const past = days.filter((d) => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let run = 0;
  let busiest: ContributionDay | null = null;
  let total = 0;
  let active = 0;
  for (const d of past) {
    total += d.count;
    if (d.count > 0) {
      active++;
      run++;
      longest = Math.max(longest, run);
      if (!busiest || d.count > busiest.count) busiest = d;
    } else {
      run = 0;
    }
  }
  // Current streak: walk back from today; an empty "today" doesn't break it yet.
  let current = 0;
  for (let i = past.length - 1; i >= 0; i--) {
    const d = past[i]!;
    if (d.count > 0) current++;
    else if (i === past.length - 1 && d.date === today) continue;
    else break;
  }
  return { total, activeDays: active, longestStreak: longest, currentStreak: current, busiest };
}

/** Sum contributions into 7-day buckets (calendar weeks), newest `weeks` only. */
export function weeklyTotals(days: ContributionDay[], weeks: number): { weekStart: string; count: number }[] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const out: { weekStart: string; count: number }[] = [];
  for (let i = 0; i < sorted.length; i += 7) {
    const chunk = sorted.slice(i, i + 7);
    out.push({ weekStart: chunk[0]!.date, count: chunk.reduce((s, d) => s + d.count, 0) });
  }
  return out.slice(-weeks);
}

export interface MonthBucket {
  key: string;
  label: string;
  merged: number;
  closed: number;
  open: number;
}

function monthKeys(months: number, now: number): { key: string; label: string }[] {
  const d = new Date(now);
  const out: { key: string; label: string }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push({
      key: `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}`,
      label: m.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
    });
  }
  return out;
}

export interface MonthlyResult {
  buckets: MonthBucket[];
  /** Set when the API returned fewer items than exist, so older months are incomplete. */
  note: string | null;
}

/**
 * Bucket search results by month of creation. If GitHub has more results than we
 * fetched, months at or before the oldest fetched item are dropped as incomplete,
 * rather than shown as misleadingly low numbers.
 */
function bucketize(
  items: SearchItem[],
  total: number,
  noun: string,
  months: number,
  now: number,
): { keys: { key: string; label: string }[]; per: Map<string, SearchItem[]>; note: string | null } {
  let keys = monthKeys(months, now);
  const truncated = total > items.length;
  let note: string | null = null;
  if (truncated && items.length) {
    const oldest = items.reduce((m, i) => (i.created_at < m ? i.created_at : m), items[0]!.created_at).slice(0, 7);
    const kept = keys.filter((k) => k.key > oldest);
    if (kept.length < keys.length) {
      keys = kept;
      note = `Based on your ${items.length} most recent ${noun} (of ${total}). Earlier months are left out because they would be incomplete.`;
    }
  }
  const per = new Map<string, SearchItem[]>();
  for (const it of items) {
    const k = it.created_at.slice(0, 7);
    if (keys.some((x) => x.key === k)) per.set(k, [...(per.get(k) ?? []), it]);
  }
  return { keys, per, note };
}

export function pullActivityByMonth(items: SearchItem[], total: number, months = 6, now: number = Date.now()): MonthlyResult {
  const { keys, per, note } = bucketize(items, total, 'pull requests', months, now);
  const buckets = keys.map(({ key, label }) => {
    const list = per.get(key) ?? [];
    return {
      key,
      label,
      merged: list.filter((i) => i.pull_request?.merged_at).length,
      closed: list.filter((i) => i.state === 'closed' && !i.pull_request?.merged_at).length,
      open: list.filter((i) => i.state === 'open').length,
    };
  });
  return { buckets, note };
}

export function issueActivityByMonth(
  items: SearchItem[],
  total: number,
  months = 6,
  now: number = Date.now(),
): { buckets: { key: string; label: string; opened: number; closed: number }[]; note: string | null } {
  const { keys, per, note } = bucketize(items, total, 'issues', months, now);
  return {
    buckets: keys.map(({ key, label }) => {
      const list = per.get(key) ?? [];
      return { key, label, opened: list.length, closed: list.filter((i) => i.state === 'closed').length };
    }),
    note,
  };
}
