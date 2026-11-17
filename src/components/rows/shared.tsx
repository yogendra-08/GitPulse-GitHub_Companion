import type { ReactNode } from 'react';
import { readableTextOn } from '@/lib/format';
import type { Label } from '@/shared/types';

export function LabelChip({ label }: { label: Label }) {
  const bg = `#${label.color}`;
  return (
    <span
      className="inline-flex items-center rounded px-1.5 text-xs leading-4"
      style={{ backgroundColor: bg, color: readableTextOn(label.color) }}
    >
      {label.name}
    </span>
  );
}

export function RepoName({ name }: { name: string }) {
  return <span className="truncate font-mono text-xs text-muted">{name}</span>;
}

/** Small icon + text pair used in row meta lines. */
export function Meta({ icon, children, title }: { icon?: ReactNode; children: ReactNode; title?: string }) {
  return (
    <span title={title} className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted">
      {icon}
      {children}
    </span>
  );
}

/** The whole row is one link target. */
export function RowLink({ href, children, compact = false }: { href: string; children: ReactNode; compact?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`group flex items-start gap-3 transition-colors hover:bg-raised focus-visible:bg-raised ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}
    >
      {children}
    </a>
  );
}
