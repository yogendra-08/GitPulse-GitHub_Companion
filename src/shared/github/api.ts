import type {
  ContributionCalendar,
  GitHubEvent,
  GitHubUser,
  NotificationThread,
  Repo,
  Review,
  SearchResult,
} from '../types';
import type { GitHubClient } from './client';

/** GET /user, plus the token's OAuth scopes (classic tokens only). */
export async function getAuthenticatedUser(
  client: GitHubClient,
  signal?: AbortSignal,
): Promise<{ user: GitHubUser; scopes: string[] | null }> {
  const res = await client.request<GitHubUser>('/user', { signal });
  const header = res.headers.get('x-oauth-scopes');
  const scopes = header == null ? null : header.split(',').map((s) => s.trim()).filter(Boolean);
  return { user: res.data, scopes };
}

/** Repositories the user owns, collaborates on, or can reach through an organization. */
export function listRepos(client: GitHubClient, signal?: AbortSignal): Promise<Repo[]> {
  return client.paginate<Repo>(
    '/user/repos',
    { sort: 'updated', affiliation: 'owner,collaborator,organization_member' },
    5,
    signal,
  );
}

export interface SearchParams {
  q: string;
  sort?: 'created' | 'updated' | 'comments';
  order?: 'asc' | 'desc';
  perPage?: number;
}

export function searchIssues(client: GitHubClient, p: SearchParams, signal?: AbortSignal): Promise<SearchResult> {
  return client.get<SearchResult>(
    '/search/issues',
    { q: p.q, sort: p.sort ?? 'updated', order: p.order ?? 'desc', per_page: p.perPage ?? 100 },
    signal,
  );
}

export function listReviews(client: GitHubClient, repoFullName: string, number: number, signal?: AbortSignal): Promise<Review[]> {
  return client.get<Review[]>(`/repos/${repoFullName}/pulls/${number}/reviews`, { per_page: 100 }, signal);
}

/** Recent events. For the authenticated user this includes private activity. */
export function listUserEvents(client: GitHubClient, login: string, signal?: AbortSignal): Promise<GitHubEvent[]> {
  return client.get<GitHubEvent[]>(`/users/${login}/events`, { per_page: 100 }, signal);
}

export interface NotificationsResult {
  threads: NotificationThread[];
  notModified: boolean;
  lastModified: string | null;
  /** Seconds GitHub asks clients to wait between polls. */
  pollInterval: number | null;
}

/**
 * GET /notifications. Classic tokens only. Pass `ifModifiedSince` (a previous
 * Last-Modified value) to get a free 304 when nothing changed.
 */
export async function listNotifications(
  client: GitHubClient,
  opts: { all?: boolean; ifModifiedSince?: string | null; signal?: AbortSignal } = {},
): Promise<NotificationsResult> {
  const res = await client.request<NotificationThread[]>('/notifications', {
    query: { all: opts.all ?? false, per_page: 50 },
    headers: opts.ifModifiedSince ? { 'If-Modified-Since': opts.ifModifiedSince } : undefined,
    signal: opts.signal,
  });
  const poll = res.headers.get('x-poll-interval');
  return {
    threads: res.notModified ? [] : res.data,
    notModified: res.notModified,
    lastModified: res.headers.get('last-modified'),
    pollInterval: poll ? Number(poll) : null,
  };
}

export async function markThreadRead(client: GitHubClient, id: string): Promise<void> {
  await client.request(`/notifications/threads/${id}`, { method: 'PATCH' });
}

/** "Done" removes the thread from the inbox entirely. */
export async function markThreadDone(client: GitHubClient, id: string): Promise<void> {
  await client.request(`/notifications/threads/${id}`, { method: 'DELETE' });
}

export async function markAllNotificationsRead(client: GitHubClient): Promise<void> {
  await client.request('/notifications', { method: 'PUT', body: { read: true } });
}

const CONTRIBUTIONS_QUERY = /* GraphQL */ `
  query ($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

interface ContributionsResponse {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
        weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
      };
    };
  } | null;
}

/** The contribution calendar is only exposed through GraphQL (last 12 months). */
export async function getContributionCalendar(
  client: GitHubClient,
  login: string,
  signal?: AbortSignal,
): Promise<ContributionCalendar> {
  const data = await client.graphql<ContributionsResponse>(CONTRIBUTIONS_QUERY, { login }, signal);
  const cal = data.user?.contributionsCollection.contributionCalendar;
  if (!cal) return { total: 0, days: [] };
  return {
    total: cal.totalContributions,
    days: cal.weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))),
  };
}
