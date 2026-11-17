import type { NotificationThread } from './types';

/** Human labels for GitHub's notification `reason` values. */
export const REASON_LABELS: Record<string, string> = {
  approval_requested: 'Approval requested',
  assign: 'Assigned',
  author: 'Author',
  ci_activity: 'CI activity',
  comment: 'Comment',
  invitation: 'Invitation',
  manual: 'Subscribed',
  member_feature_requested: 'Feature request',
  mention: 'Mentioned',
  review_requested: 'Review requested',
  security_alert: 'Security alert',
  security_advisory_credit: 'Advisory credit',
  state_change: 'State change',
  subscribed: 'Watching',
  team_mention: 'Team mentioned',
};

export const reasonLabel = (reason: string): string => REASON_LABELS[reason] ?? reason.replace(/_/g, ' ');

export const isMention = (t: NotificationThread): boolean => t.reason === 'mention' || t.reason === 'team_mention';
export const isReviewRequest = (t: NotificationThread): boolean => t.reason === 'review_requested';
export const isDirect = (t: NotificationThread): boolean =>
  isMention(t) || isReviewRequest(t) || t.reason === 'assign' || t.reason === 'approval_requested';

/**
 * Notification subjects only carry API URLs. Convert them to the matching
 * github.com page, falling back to the repository when we can't.
 */
export function threadHtmlUrl(t: NotificationThread): string {
  const repoUrl = t.repository.html_url;
  const api = t.subject.url;
  if (!api) return repoUrl;
  const m = api.match(/\/repos\/([^/]+\/[^/]+)\/(pulls|issues|commits|releases|check-suites)\/([^/?#]+)/);
  if (!m) return repoUrl;
  const [, repo, kind, id] = m;
  switch (kind) {
    case 'pulls':
      return `https://github.com/${repo}/pull/${id}`;
    case 'issues':
      return `https://github.com/${repo}/issues/${id}`;
    case 'commits':
      return `https://github.com/${repo}/commit/${id}`;
    case 'releases':
      return `https://github.com/${repo}/releases`;
    default:
      return `https://github.com/${repo}/actions`;
  }
}

/** Only ever open github.com links from notification clicks. */
export const isGitHubUrl = (url: string): boolean => /^https:\/\/github\.com\//.test(url);
