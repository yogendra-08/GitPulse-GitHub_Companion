import type { ReactNode } from 'react';
import { AlertTriangle, CloudOff, Clock, Lock, RotateCw } from 'lucide-react';
import { isGitHubError } from '@/shared/github/client';
import { timeUntil } from '@/lib/time';
import { Button } from './Button';

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 text-faint">{icon}</div>}
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  error: Error;
  onRetry?: () => void;
  /** Smaller layout for popups and cards. */
  compact?: boolean;
}

/** Explains what failed and offers the one action most likely to fix it. */
export function ErrorState({ error, onRetry, compact = false }: ErrorStateProps) {
  const kind = isGitHubError(error) ? error.kind : 'unknown';
  const Icon = kind === 'network' ? CloudOff : kind === 'rate_limited' ? Clock : kind === 'forbidden' || kind === 'unauthorized' ? Lock : AlertTriangle;
  const title =
    kind === 'network'
      ? 'You appear to be offline'
      : kind === 'rate_limited'
        ? 'GitHub rate limit reached'
        : kind === 'forbidden'
          ? 'Access denied'
          : kind === 'unauthorized'
            ? 'Token not accepted'
            : kind === 'not_found'
              ? 'Not found'
              : 'Couldn\u2019t load this';
  const resetAt = isGitHubError(error) ? error.resetAt : null;
  return (
    <div role="alert" className={`flex flex-col items-center text-center ${compact ? 'px-4 py-8' : 'px-6 py-12'}`}>
      <Icon aria-hidden size={20} className="mb-3 text-faint" />
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{error.message}</p>
      {resetAt && <p className="mt-1 text-xs text-faint">Resets in about {timeUntil(resetAt)}.</p>}
      {onRetry && kind !== 'unauthorized' && (
        <Button className="mt-4" size="sm" icon={<RotateCw size={13} />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Slim notice shown above stale data when a background refresh failed. */
export function StaleNotice({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div role="status" className="flex items-center justify-between gap-3 border-b border-line bg-raised px-4 py-2 text-xs text-muted">
      <span className="min-w-0 truncate">Showing saved data. {error.message}</span>
      <button type="button" onClick={onRetry} className="shrink-0 text-ink underline-offset-2 hover:underline">
        Retry
      </button>
    </div>
  );
}
