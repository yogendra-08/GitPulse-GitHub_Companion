import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'open' | 'merged' | 'closed' | 'info' | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'bg-raised text-muted border-line',
  open: 'bg-open/10 text-open border-open/30',
  merged: 'bg-merged/10 text-merged border-merged/30',
  closed: 'bg-closed/10 text-closed border-closed/30',
  info: 'bg-info/10 text-info border-info/30',
  accent: 'bg-accent/10 text-accent border-accent/30',
};

export function Badge({ tone = 'neutral', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-px text-xs leading-4 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
