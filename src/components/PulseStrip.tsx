import type { ContributionDay } from '@/shared/types';
import { formatDay } from '@/lib/time';

interface Props {
  days: ContributionDay[];
  height?: number;
  /** Describes what the bars count, for tooltips and screen readers. */
  noun: string;
}

/**
 * One bar per day. Quiet days render as a thin line, so "nothing happened"
 * is visibly different from "no data" (which renders nothing at all).
 */
export function PulseStrip({ days, height = 64, noun }: Props) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);
  return (
    <div
      role="img"
      aria-label={`${total} ${noun} over the last ${days.length} days`}
      className="flex items-end gap-[2px]"
      style={{ height }}
    >
      {days.map((d) => (
        <div
          key={d.date}
          title={`${d.count} ${d.count === 1 ? noun.replace(/s$/, '') : noun} on ${formatDay(d.date)}`}
          className="min-w-[2px] flex-1 rounded-[1px]"
          style={{
            height: d.count ? `${Math.max(14, (d.count / max) * 100)}%` : 2,
            backgroundColor: d.count ? 'rgb(var(--accent))' : 'rgb(var(--line-strong))',
            opacity: d.count ? 0.4 + 0.6 * (d.count / max) : 1,
          }}
        />
      ))}
    </div>
  );
}
