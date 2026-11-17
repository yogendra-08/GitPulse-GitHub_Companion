import { useCallback } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import type { GitHubClient } from '@/shared/github/client';
import { useQuery, type QueryState } from '@/hooks/useQuery';
import {
  getContributionCalendar,
  listNotifications,
  listRepos,
  listReviews,
  listUserEvents,
  searchIssues,
} from '@/shared/github/api';
import { issueQuery, pullRequestQuery, repoFromUrl, type IssueRole, type IssueState, type PullRole, type PullState } from '@/lib/queries';
import { summarizeReviews, type ReviewStatus } from '@/lib/reviews';
import { describeEvent, type ActivityItem } from '@/lib/activity';
import type { ContributionCalendar, NotificationThread, Repo, SearchResult } from '@/shared/types';

const MIN = 60_000;

function useScoped<T>(
  key: string | null,
  run: (c: GitHubClient, signal: AbortSignal) => Promise<T>,
  ttlMs: number,
  enabled = true,
): QueryState<T> {
  const { client, user } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => run(client!, signal), [client, run]);
  return useQuery<T>(client && user && key ? `${user.login}:${key}` : null, fetcher, { ttlMs, enabled: enabled && !!client });
}

export function useRepos(): QueryState<Repo[]> {
  return useScoped('repos', useCallback((c, s) => listRepos(c, s), []), 10 * MIN);
}

export function usePullRequests(role: PullRole, state: PullState, sort: 'updated' | 'created' = 'updated'): QueryState<SearchResult> {
  const { user } = useAuth();
  const login = user?.login ?? '';
  const run = useCallback(
    (c: GitHubClient, s: AbortSignal) =>
      searchIssues(c, { q: pullRequestQuery(login, role, state), sort }, s),
    [login, role, state, sort],
  );
  return useScoped(user ? `pulls:${role}:${state}:${sort}` : null, run, 3 * MIN);
}

export function useIssues(role: IssueRole, state: IssueState, sort: 'updated' | 'created' = 'updated'): QueryState<SearchResult> {
  const { user } = useAuth();
  const login = user?.login ?? '';
  const run = useCallback(
    (c: GitHubClient, s: AbortSignal) =>
      searchIssues(c, { q: issueQuery(login, role, state), sort }, s),
    [login, role, state, sort],
  );
  return useScoped(user ? `issues:${role}:${state}:${sort}` : null, run, 3 * MIN);
}

/** Everything the user has authored, any state, newest first. Feeds the analytics charts. */
export function useAuthoredHistory(kind: 'pr' | 'issue'): QueryState<SearchResult> {
  const { user } = useAuth();
  const login = user?.login ?? '';
  const run = useCallback(
    (c: GitHubClient, s: AbortSignal) =>
      searchIssues(c, { q: `is:${kind === 'pr' ? 'pr' : 'issue'} author:${login}`, sort: 'created', perPage: 100 }, s),
    [login, kind],
  );
  return useScoped(user ? `history:${kind}` : null, run, 15 * MIN);
}

export function useNotifications(all: boolean): QueryState<NotificationThread[]> {
  const { notifications } = useAuth();
  const run = useCallback(async (c: GitHubClient, s: AbortSignal) => {
    const res = await listNotifications(c, { all, signal: s });
    return res.threads;
  }, [all]);
  // Short TTL: this is the one dataset people expect to be near-live.
  return useScoped(`notifications:${all ? 'all' : 'unread'}`, run, 1 * MIN, notifications.supported);
}

export function useActivity(): QueryState<ActivityItem[]> {
  const { user } = useAuth();
  const login = user?.login ?? '';
  const run = useCallback(
    async (c: GitHubClient, s: AbortSignal) =>
      (await listUserEvents(c, login, s)).map(describeEvent),
    [login],
  );
  return useScoped(user ? 'events' : null, run, 5 * MIN);
}

export function useContributions(): QueryState<ContributionCalendar> {
  const { user } = useAuth();
  const login = user?.login ?? '';
  const run = useCallback(
    (c: GitHubClient, s: AbortSignal) => getContributionCalendar(c, login, s),
    [login],
  );
  return useScoped(user ? 'contributions' : null, run, 30 * MIN);
}

/**
 * Review status for a list of open PRs, one request each (capped). Returns a map of
 * PR html_url -> status. PRs whose reviews can't be read are simply absent.
 */
export function useReviewStatuses(pulls: SearchResult['items'] | undefined, limit = 20): QueryState<Record<string, ReviewStatus>> {
  const open = (pulls ?? []).filter((p) => p.state === 'open').slice(0, limit);
  const sig = open.map((p) => p.id).join(',');
  const run = useCallback(
    async (c: GitHubClient, s: AbortSignal) => {
      const out: Record<string, ReviewStatus> = {};
      const queue = [...open];
      const worker = async () => {
        for (let p = queue.shift(); p; p = queue.shift()) {
          try {
            out[p.html_url] = summarizeReviews(await listReviews(c, repoFromUrl(p.repository_url), p.number, s));
          } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') throw e;
            /* leave this PR without a status */
          }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      return out;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sig],
  );
  return useScoped(open.length ? `reviews:${sig}` : null, run, 5 * MIN);
}

/**
 * Optimistically edit the cached notification lists so every open view updates at
 * once. `edit` receives the current list; return the new one.
 */
export async function mutateNotificationCache(login: string, edit: (list: NotificationThread[]) => NotificationThread[]): Promise<void> {
  const { cacheRead, cacheWrite } = await import('@/shared/cache');
  for (const suffix of ['unread', 'all']) {
    const key = `${login}:notifications:${suffix}`;
    const hit = await cacheRead<NotificationThread[]>(key);
    if (hit) await cacheWrite(key, edit(hit.data));
  }
}
