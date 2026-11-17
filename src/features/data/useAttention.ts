import { useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { buildAttention, type AttentionItem } from '@/lib/attention';
import { useIssues, useNotifications, usePullRequests, useReviewStatuses } from './queries';

export interface AttentionState {
  items: AttentionItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  /** Counts used by badges and summaries. */
  counts: { reviewRequests: number; assignedIssues: number; unread: number | null };
}

/** Aggregates the four sources that can demand attention into one ranked list. */
export function useAttention(): AttentionState {
  const { notifications: cap } = useAuth();
  const reviewReq = usePullRequests('review-requested', 'open');
  const authored = usePullRequests('authored', 'open');
  const assigned = useIssues('assigned', 'open');
  const notifs = useNotifications(false);
  const reviews = useReviewStatuses(authored.data?.items);

  const items = useMemo(
    () =>
      buildAttention({
        reviewRequests: reviewReq.data?.items,
        authoredOpen: authored.data?.items,
        reviews: reviews.data,
        assignedIssues: assigned.data?.items,
        notifications: cap.supported ? notifs.data : undefined,
      }),
    [reviewReq.data, authored.data, reviews.data, assigned.data, notifs.data, cap.supported],
  );

  const core = [reviewReq, authored, assigned];
  const loading = core.some((q) => q.loading);
  const failing = core.find((q) => q.error && q.data === undefined);

  return {
    items,
    loading,
    error: failing?.error ?? null,
    refetch: () => core.forEach((q) => q.refetch()),
    counts: {
      reviewRequests: reviewReq.data?.total_count ?? 0,
      assignedIssues: assigned.data?.total_count ?? 0,
      unread: cap.supported && notifs.data ? notifs.data.filter((t) => t.unread).length : null,
    },
  };
}
