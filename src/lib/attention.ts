import type { NotificationThread, SearchItem } from '@/shared/types';
import { isMention, isReviewRequest, threadHtmlUrl } from '@/shared/notifications';
import { repoFromUrl } from './queries';
import type { ReviewStatus } from './reviews';

export type AttentionReason = 'changes_requested' | 'review_requested' | 'mentioned' | 'assigned';

export interface AttentionItem {
  id: string;
  reason: AttentionReason;
  title: string;
  repo: string;
  url: string;
  at: string;
  kind: 'pr' | 'issue' | 'other';
}

export const ATTENTION_LABELS: Record<AttentionReason, string> = {
  changes_requested: 'Changes requested',
  review_requested: 'Needs your review',
  mentioned: 'Mentioned you',
  assigned: 'Assigned to you',
};

/** Lower number = more urgent. */
const PRIORITY: Record<AttentionReason, number> = {
  changes_requested: 0,
  review_requested: 1,
  mentioned: 2,
  assigned: 3,
};

interface Inputs {
  reviewRequests?: SearchItem[];
  authoredOpen?: SearchItem[];
  reviews?: Record<string, ReviewStatus>;
  assignedIssues?: SearchItem[];
  notifications?: NotificationThread[];
}

/**
 * Build the "needs your attention" list. The same link can show up from several
 * sources (a review request is both a search hit and a notification), so we keep
 * only the most urgent reason per URL.
 */
export function buildAttention(i: Inputs): AttentionItem[] {
  const byUrl = new Map<string, AttentionItem>();
  const add = (item: AttentionItem) => {
    const existing = byUrl.get(item.url);
    if (!existing || PRIORITY[item.reason] < PRIORITY[existing.reason]) byUrl.set(item.url, item);
  };

  for (const pr of i.authoredOpen ?? []) {
    if (i.reviews?.[pr.html_url] === 'changes_requested') {
      add({ id: `cr:${pr.id}`, reason: 'changes_requested', title: pr.title, repo: repoFromUrl(pr.repository_url), url: pr.html_url, at: pr.updated_at, kind: 'pr' });
    }
  }
  for (const pr of i.reviewRequests ?? []) {
    if (pr.draft) continue;
    add({ id: `rr:${pr.id}`, reason: 'review_requested', title: pr.title, repo: repoFromUrl(pr.repository_url), url: pr.html_url, at: pr.updated_at, kind: 'pr' });
  }
  for (const t of i.notifications ?? []) {
    if (!t.unread) continue;
    if (isMention(t) || isReviewRequest(t)) {
      add({
        id: `n:${t.id}`,
        reason: isReviewRequest(t) ? 'review_requested' : 'mentioned',
        title: t.subject.title,
        repo: t.repository.full_name,
        url: threadHtmlUrl(t),
        at: t.updated_at,
        kind: t.subject.type === 'PullRequest' ? 'pr' : t.subject.type === 'Issue' ? 'issue' : 'other',
      });
    }
  }
  for (const issue of i.assignedIssues ?? []) {
    add({ id: `as:${issue.id}`, reason: 'assigned', title: issue.title, repo: repoFromUrl(issue.repository_url), url: issue.html_url, at: issue.updated_at, kind: 'issue' });
  }

  return [...byUrl.values()].sort((a, b) => PRIORITY[a.reason] - PRIORITY[b.reason] || b.at.localeCompare(a.at));
}
