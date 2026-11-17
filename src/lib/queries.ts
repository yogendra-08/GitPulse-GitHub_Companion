export type PullRole = 'authored' | 'review-requested' | 'assigned';
export type PullState = 'open' | 'merged' | 'closed';
export type IssueRole = 'assigned' | 'authored' | 'mentioned';
export type IssueState = 'open' | 'closed';

const roleQualifier = (role: PullRole | IssueRole, login: string): string => {
  switch (role) {
    case 'authored':
      return `author:${login}`;
    case 'review-requested':
      return `review-requested:${login}`;
    case 'assigned':
      return `assignee:${login}`;
    case 'mentioned':
      return `mentions:${login}`;
  }
};

/** Search query for pull requests. Closed means closed without merging. */
export function pullRequestQuery(login: string, role: PullRole, state: PullState): string {
  // Review requests only make sense while a PR is still open.
  const effectiveState: PullState = role === 'review-requested' ? 'open' : state;
  const stateQ = effectiveState === 'open' ? 'is:open' : effectiveState === 'merged' ? 'is:merged' : 'is:closed is:unmerged';
  return `is:pr ${stateQ} ${roleQualifier(role, login)} archived:false`;
}

export function issueQuery(login: string, role: IssueRole, state: IssueState): string {
  return `is:issue is:${state} ${roleQualifier(role, login)} archived:false`;
}

/** "https://api.github.com/repos/o/r" -> "o/r" */
export function repoFromUrl(repositoryUrl: string): string {
  const m = repositoryUrl.match(/\/repos\/([^/]+\/[^/]+)$/);
  return m && m[1] ? m[1] : repositoryUrl;
}
