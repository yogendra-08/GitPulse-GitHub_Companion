import { describe, expect, it } from 'vitest';
import { timeAgo } from './time';
import { compactNumber, readableTextOn } from './format';
import { issueQuery, pullRequestQuery, repoFromUrl } from './queries';
import { summarizeReviews } from './reviews';
import { filterRepos, languageDistribution, DEFAULT_REPO_FILTERS } from './repos';
import { buildAttention } from './attention';
import { contributionStats, issueActivityByMonth, pullActivityByMonth, weeklyTotals } from './aggregate';
import { describeEvent } from './activity';
import type { GitHubEvent, NotificationThread, Repo, SearchItem } from '@/shared/types';

const NOW = Date.parse('2026-03-15T12:00:00Z');

const item = (o: Partial<SearchItem> & { id: number }): SearchItem => ({
  number: o.id,
  title: `item ${o.id}`,
  html_url: `https://github.com/o/r/pull/${o.id}`,
  state: 'open',
  user: null,
  labels: [],
  assignees: [],
  comments: 0,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-02T00:00:00Z',
  closed_at: null,
  repository_url: 'https://api.github.com/repos/o/r',
  ...o,
});

describe('time and format', () => {
  it('formats relative time', () => {
    expect(timeAgo('2026-03-15T11:59:30Z', NOW)).toBe('just now');
    expect(timeAgo('2026-03-15T11:30:00Z', NOW)).toBe('30m ago');
    expect(timeAgo('2026-03-15T06:00:00Z', NOW)).toBe('6h ago');
    expect(timeAgo('2026-03-12T12:00:00Z', NOW)).toBe('3d ago');
    expect(timeAgo('2026-02-22T12:00:00Z', NOW)).toBe('3w ago');
    expect(timeAgo(null)).toBe('never');
  });
  it('compacts numbers', () => {
    expect(compactNumber(999)).toBe('999');
    expect(compactNumber(1200)).toBe('1.2k');
    expect(compactNumber(15300)).toBe('15k');
    expect(compactNumber(2_000_000)).toBe('2M');
  });
  it('chooses readable label text', () => {
    expect(readableTextOn('ffffff')).toBe('#1b1f24');
    expect(readableTextOn('000000')).toBe('#ffffff');
  });
});

describe('search queries', () => {
  it('builds PR queries per state', () => {
    expect(pullRequestQuery('ada', 'authored', 'open')).toBe('is:pr is:open author:ada archived:false');
    expect(pullRequestQuery('ada', 'authored', 'merged')).toContain('is:merged');
    expect(pullRequestQuery('ada', 'authored', 'closed')).toContain('is:closed is:unmerged');
  });
  it('forces review requests to open PRs', () => {
    expect(pullRequestQuery('ada', 'review-requested', 'merged')).toBe('is:pr is:open review-requested:ada archived:false');
  });
  it('builds issue queries', () => {
    expect(issueQuery('ada', 'assigned', 'open')).toBe('is:issue is:open assignee:ada archived:false');
    expect(issueQuery('ada', 'mentioned', 'closed')).toContain('mentions:ada');
  });
  it('extracts repo names', () => {
    expect(repoFromUrl('https://api.github.com/repos/octo/hello')).toBe('octo/hello');
  });
});

describe('summarizeReviews', () => {
  const r = (id: number, user: string, state: string, at: string) => ({ id, state, user: { login: user }, submitted_at: at });
  it('returns none without reviews', () => expect(summarizeReviews([])).toBe('none'));
  it('uses each reviewer’s latest decisive review', () => {
    expect(summarizeReviews([r(1, 'a', 'CHANGES_REQUESTED', '2026-01-01T00:00:00Z'), r(2, 'a', 'APPROVED', '2026-01-02T00:00:00Z')])).toBe('approved');
  });
  it('changes requested wins over approvals', () => {
    expect(summarizeReviews([r(1, 'a', 'APPROVED', '2026-01-01T00:00:00Z'), r(2, 'b', 'CHANGES_REQUESTED', '2026-01-02T00:00:00Z')])).toBe('changes_requested');
  });
  it('a dismissed review no longer counts', () => {
    expect(summarizeReviews([r(1, 'a', 'CHANGES_REQUESTED', '2026-01-01T00:00:00Z'), r(2, 'a', 'DISMISSED', '2026-01-02T00:00:00Z')])).toBe('none');
  });
  it('comment-only reviews report commented', () => {
    expect(summarizeReviews([r(1, 'a', 'COMMENTED', '2026-01-01T00:00:00Z')])).toBe('commented');
  });
});

describe('repos', () => {
  const repo = (o: Partial<Repo> & { id: number }): Repo => ({
    name: `r${o.id}`, full_name: `me/r${o.id}`, html_url: '', description: null, private: false, fork: false, archived: false,
    language: 'TypeScript', stargazers_count: 0, forks_count: 0, open_issues_count: 0, default_branch: 'main',
    pushed_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', owner: { login: 'me', avatar_url: '' }, ...o,
  });
  const repos = [
    repo({ id: 1, stargazers_count: 5, private: true, language: 'Go', pushed_at: '2026-02-01T00:00:00Z' }),
    repo({ id: 2, stargazers_count: 9, fork: true }),
    repo({ id: 3, language: null, archived: true, description: 'Tiny CLI' }),
  ];
  it('filters by visibility, language, forks and text', () => {
    expect(filterRepos(repos, { ...DEFAULT_REPO_FILTERS, visibility: 'private' }).map((r) => r.id)).toEqual([1]);
    expect(filterRepos(repos, { ...DEFAULT_REPO_FILTERS, language: 'Go' }).map((r) => r.id)).toEqual([1]);
    expect(filterRepos(repos, { ...DEFAULT_REPO_FILTERS, hideForks: true, hideArchived: true }).map((r) => r.id)).toEqual([1]);
    expect(filterRepos(repos, { ...DEFAULT_REPO_FILTERS, query: 'cli' }).map((r) => r.id)).toEqual([3]);
  });
  it('sorts by stars', () => {
    expect(filterRepos(repos, { ...DEFAULT_REPO_FILTERS, sort: 'stars' })[0]!.id).toBe(2);
  });
  it('reports unknown languages separately instead of inventing them', () => {
    const d = languageDistribution(repos);
    expect(d.unknown).toBe(1);
    expect(d.shares.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1);
  });
});

describe('buildAttention', () => {
  it('ranks reasons and dedupes by URL', () => {
    const pr = item({ id: 1 });
    const thread: NotificationThread = {
      id: 't1', unread: true, reason: 'mention', updated_at: '2026-03-10T00:00:00Z', last_read_at: null,
      subject: { title: 'item 1', url: 'https://api.github.com/repos/o/r/pulls/1', latest_comment_url: null, type: 'PullRequest' },
      repository: { full_name: 'o/r', html_url: 'https://github.com/o/r', private: false },
    };
    const issue = item({ id: 9, html_url: 'https://github.com/o/r/issues/9' });
    const out = buildAttention({ reviewRequests: [pr], notifications: [thread], assignedIssues: [issue] });
    expect(out.map((i) => i.reason)).toEqual(['review_requested', 'assigned']);
  });
  it('skips draft review requests and puts requested changes first', () => {
    const mine = item({ id: 5, html_url: 'https://github.com/o/r/pull/5' });
    const out = buildAttention({
      reviewRequests: [item({ id: 6, draft: true })],
      authoredOpen: [mine],
      reviews: { [mine.html_url]: 'changes_requested' },
    });
    expect(out).toHaveLength(1);
    expect(out[0]!.reason).toBe('changes_requested');
  });
});

describe('contribution stats', () => {
  const days = [
    { date: '2026-03-10', count: 2 }, { date: '2026-03-11', count: 0 },
    { date: '2026-03-12', count: 1 }, { date: '2026-03-13', count: 3 },
    { date: '2026-03-14', count: 1 }, { date: '2026-03-15', count: 0 },
    { date: '2026-03-16', count: 9 }, // future day: ignored
  ];
  it('computes totals and streaks ignoring future days', () => {
    const s = contributionStats(days, '2026-03-15');
    expect(s.total).toBe(7);
    expect(s.activeDays).toBe(4);
    expect(s.longestStreak).toBe(3);
    expect(s.currentStreak).toBe(3); // today is empty but not yet a break
    expect(s.busiest?.date).toBe('2026-03-13');
  });
  it('groups into weeks', () => {
    expect(weeklyTotals(days, 4)).toEqual([{ weekStart: '2026-03-10', count: 16 }]);
  });
});

describe('monthly activity', () => {
  it('buckets by month and merged state', () => {
    const items = [
      item({ id: 1, created_at: '2026-03-02T00:00:00Z', state: 'closed', pull_request: { merged_at: '2026-03-03T00:00:00Z', html_url: '' } }),
      item({ id: 2, created_at: '2026-03-04T00:00:00Z', state: 'closed' }),
      item({ id: 3, created_at: '2026-02-04T00:00:00Z' }),
    ];
    const { buckets, note } = pullActivityByMonth(items, 3, 3, NOW);
    expect(note).toBeNull();
    expect(buckets.map((b) => [b.key, b.merged, b.closed, b.open])).toEqual([['2026-01', 0, 0, 0], ['2026-02', 0, 0, 1], ['2026-03', 1, 1, 0]]);
  });
  it('drops incomplete months when results are truncated', () => {
    const items = [item({ id: 1, created_at: '2026-03-02T00:00:00Z' }), item({ id: 2, created_at: '2026-01-20T00:00:00Z' })];
    const { buckets, note } = issueActivityByMonth(items, 50, 4, NOW);
    expect(buckets.map((b) => b.key)).toEqual(['2026-02', '2026-03']);
    expect(note).toMatch(/most recent/);
  });
});

describe('describeEvent', () => {
  const ev = (type: string, payload: GitHubEvent['payload']): GitHubEvent => ({ id: '1', type, actor: { login: 'a' }, repo: { name: 'o/r' }, created_at: '2026-03-01T00:00:00Z', payload });
  it('describes pushes and merges', () => {
    expect(describeEvent(ev('PushEvent', { ref: 'refs/heads/main' }))).toMatchObject({ kind: 'push', summary: 'Pushed to main', url: 'https://github.com/o/r/tree/main' });
    expect(describeEvent(ev('PullRequestEvent', { action: 'closed', pull_request: { number: 4, title: 't', merged: true, html_url: 'u' } })).summary).toBe('Merged pull request #4');
  });
  it('falls back for unknown events', () => {
    expect(describeEvent(ev('GollumEvent', {})).summary).toBe('Gollum');
  });
});
