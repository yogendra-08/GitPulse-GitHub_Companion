import type { GitHubEvent } from '@/shared/types';

export type ActivityKind = 'push' | 'pr' | 'issue' | 'review' | 'comment' | 'create' | 'delete' | 'star' | 'fork' | 'release' | 'other';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  summary: string;
  repo: string;
  url: string;
  at: string;
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Turn a raw GitHub event into a one-line description with the most useful link. */
export function describeEvent(e: GitHubEvent): ActivityItem {
  const repoUrl = `https://github.com/${e.repo.name}`;
  const p = e.payload;
  const base = { id: e.id, repo: e.repo.name, at: e.created_at };

  switch (e.type) {
    case 'PushEvent': {
      const branch = (p.ref ?? '').replace('refs/heads/', '');
      return { ...base, kind: 'push', summary: branch ? `Pushed to ${branch}` : 'Pushed commits', url: branch ? `${repoUrl}/tree/${branch}` : repoUrl };
    }
    case 'PullRequestEvent': {
      const pr = p.pull_request;
      const n = pr?.number ?? p.number;
      const action = p.action === 'closed' && pr?.merged ? 'merged' : (p.action ?? 'updated');
      return { ...base, kind: 'pr', summary: `${cap(action)} pull request #${n}`, url: pr?.html_url ?? repoUrl };
    }
    case 'PullRequestReviewEvent': {
      const pr = p.pull_request;
      return { ...base, kind: 'review', summary: `Reviewed pull request #${pr?.number ?? ''}`.trim(), url: p.review?.html_url ?? pr?.html_url ?? repoUrl };
    }
    case 'PullRequestReviewCommentEvent': {
      const pr = p.pull_request;
      return { ...base, kind: 'comment', summary: `Commented on pull request #${pr?.number ?? ''}`.trim(), url: p.comment?.html_url ?? pr?.html_url ?? repoUrl };
    }
    case 'IssuesEvent':
      return { ...base, kind: 'issue', summary: `${cap(p.action ?? 'updated')} issue #${p.issue?.number ?? ''}`.trim(), url: p.issue?.html_url ?? repoUrl };
    case 'IssueCommentEvent': {
      const what = p.issue?.pull_request ? 'pull request' : 'issue';
      return { ...base, kind: 'comment', summary: `Commented on ${what} #${p.issue?.number ?? ''}`.trim(), url: p.comment?.html_url ?? p.issue?.html_url ?? repoUrl };
    }
    case 'CreateEvent':
      return { ...base, kind: 'create', summary: p.ref ? `Created ${p.ref_type} ${p.ref}` : `Created ${p.ref_type ?? 'repository'}`, url: repoUrl };
    case 'DeleteEvent':
      return { ...base, kind: 'delete', summary: `Deleted ${p.ref_type ?? 'ref'} ${p.ref ?? ''}`.trim(), url: repoUrl };
    case 'WatchEvent':
      return { ...base, kind: 'star', summary: 'Starred a repository', url: repoUrl };
    case 'ForkEvent':
      return { ...base, kind: 'fork', summary: 'Forked a repository', url: p.forkee?.html_url ?? repoUrl };
    case 'ReleaseEvent':
      return { ...base, kind: 'release', summary: `Published release ${p.release?.tag_name ?? ''}`.trim(), url: p.release?.html_url ?? repoUrl };
    case 'PublicEvent':
      return { ...base, kind: 'other', summary: 'Made a repository public', url: repoUrl };
    default:
      return { ...base, kind: 'other', summary: e.type.replace(/Event$/, ''), url: repoUrl };
  }
}

export const KIND_LABELS: Record<ActivityKind, string> = {
  push: 'Pushes',
  pr: 'Pull requests',
  review: 'Reviews',
  issue: 'Issues',
  comment: 'Comments',
  create: 'Branches & tags created',
  delete: 'Deletions',
  star: 'Stars',
  fork: 'Forks',
  release: 'Releases',
  other: 'Other',
};
