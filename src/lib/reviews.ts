import type { Review } from '@/shared/types';

export type ReviewStatus = 'approved' | 'changes_requested' | 'commented' | 'none';

/**
 * Collapse a PR's review history into one status. Only each reviewer's latest
 * decisive review counts (APPROVED / CHANGES_REQUESTED); dismissed reviews are
 * ignored, and plain comments only matter if nothing decisive exists.
 */
export function summarizeReviews(reviews: Review[]): ReviewStatus {
  const latest = new Map<string, Review['state']>();
  let commented = false;
  const ordered = [...reviews].sort((a, b) => Date.parse(a.submitted_at ?? '') - Date.parse(b.submitted_at ?? '') || a.id - b.id);
  for (const r of ordered) {
    const who = r.user?.login;
    if (!who) continue;
    if (r.state === 'COMMENTED') {
      commented = true;
    } else if (r.state === 'DISMISSED') {
      latest.delete(who);
    } else if (r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED') {
      latest.set(who, r.state);
    }
  }
  const states = [...latest.values()];
  if (states.includes('CHANGES_REQUESTED')) return 'changes_requested';
  if (states.includes('APPROVED')) return 'approved';
  return commented ? 'commented' : 'none';
}

export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  approved: 'Approved',
  changes_requested: 'Changes requested',
  commented: 'Commented',
  none: 'No reviews',
};
