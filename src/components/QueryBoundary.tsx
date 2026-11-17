import type { ReactNode } from 'react';
import type { QueryState } from '@/hooks/useQuery';
import { ErrorState, StaleNotice } from './ui/States';
import { ListSkeleton } from './ui/Skeleton';

interface Props<T> {
  query: QueryState<T>;
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
  compact?: boolean;
}

/** Renders loading, error, and stale-data states so pages only describe the happy path. */
export function QueryBoundary<T>({ query, children, skeleton, compact }: Props<T>) {
  if (query.data === undefined) {
    if (query.error) return <ErrorState error={query.error} onRetry={query.refetch} compact={compact} />;
    return <>{skeleton ?? <ListSkeleton compact={compact} />}</>;
  }
  return (
    <>
      {query.error && <StaleNotice error={query.error} onRetry={query.refetch} />}
      {children(query.data)}
    </>
  );
}
