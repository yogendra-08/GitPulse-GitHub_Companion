import { describe, expect, it, vi } from 'vitest';
import { checkTokenFormat, detectTokenKind, notificationsCapability } from './auth';
import { GitHubClient, GitHubError, errorFromResponse, parseNextLink } from './github/client';
import { listNotifications } from './github/api';
import { isGitHubUrl, threadHtmlUrl } from './notifications';
import { normalizeSettings, DEFAULT_SETTINGS } from './settings';
import type { NotificationThread } from './types';

const res = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers });

describe('tokens', () => {
  it('detects kinds', () => {
    expect(detectTokenKind('ghp_abc')).toBe('classic');
    expect(detectTokenKind('github_pat_abc')).toBe('fine-grained');
    expect(detectTokenKind('gho_abc')).toBe('unknown');
  });
  it('validates format before any network call', () => {
    expect(checkTokenFormat('  ').ok).toBe(false);
    expect(checkTokenFormat('ghp_' + 'a'.repeat(36))).toMatchObject({ ok: true });
    expect(checkTokenFormat('ghp_has space_' + 'a'.repeat(20)).ok).toBe(false);
  });
  it('knows which tokens can read notifications', () => {
    expect(notificationsCapability({ kind: 'fine-grained', scopes: null }).supported).toBe(false);
    expect(notificationsCapability({ kind: 'classic', scopes: ['read:user'] }).supported).toBe(false);
    expect(notificationsCapability({ kind: 'classic', scopes: ['notifications'] }).supported).toBe(true);
    expect(notificationsCapability({ kind: 'classic', scopes: ['repo'] }).supported).toBe(true);
  });
});

describe('error mapping', () => {
  it('maps status codes to kinds', () => {
    expect(errorFromResponse(401, new Headers(), {}).kind).toBe('unauthorized');
    expect(errorFromResponse(404, new Headers(), {}).kind).toBe('not_found');
    expect(errorFromResponse(500, new Headers(), {}).kind).toBe('server');
    expect(errorFromResponse(403, new Headers(), { message: 'Resource not accessible' }).kind).toBe('forbidden');
  });
  it('detects rate limits and the reset time', () => {
    const e = errorFromResponse(403, new Headers({ 'x-ratelimit-remaining': '0', 'x-ratelimit-limit': '5000', 'x-ratelimit-reset': '2000000000' }), {});
    expect(e.kind).toBe('rate_limited');
    expect(e.resetAt).toBe(2_000_000_000_000);
    expect(e.retryable).toBe(true);
  });
});

describe('GitHubClient', () => {
  it('sends auth headers and parses JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(200, { login: 'ada' }));
    const c = new GitHubClient({ token: 't0k', fetchImpl });
    expect(await c.get('/user')).toEqual({ login: 'ada' });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.github.com/user');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer t0k');
  });
  it('calls onUnauthorized on 401', async () => {
    const onUnauthorized = vi.fn();
    const c = new GitHubClient({ token: 'x', fetchImpl: vi.fn().mockResolvedValue(res(401, { message: 'Bad credentials' })), onUnauthorized });
    await expect(c.get('/user')).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(onUnauthorized).toHaveBeenCalled();
  });
  it('retries a GET once on network failure, then reports it', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const c = new GitHubClient({ token: 'x', fetchImpl, retries: 1 });
    await expect(c.get('/user')).rejects.toMatchObject({ kind: 'network' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it('follows pagination links', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(res(200, [1, 2], { link: '<https://api.github.com/x?page=2>; rel="next"' }))
      .mockResolvedValueOnce(res(200, [3]));
    expect(await new GitHubClient({ token: 'x', fetchImpl }).paginate<number>('/x')).toEqual([1, 2, 3]);
  });
  it('surfaces GraphQL errors', async () => {
    const c = new GitHubClient({ token: 'x', fetchImpl: vi.fn().mockResolvedValue(res(200, { errors: [{ message: 'Resource not accessible by personal access token' }] })) });
    await expect(c.graphql('query {}')).rejects.toBeInstanceOf(GitHubError);
  });
  it('treats 304 as not modified (notifications polling)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 304 }));
    const out = await listNotifications(new GitHubClient({ token: 'x', fetchImpl }), { ifModifiedSince: 'Thu, 01 Jan 2026 00:00:00 GMT' });
    expect(out.notModified).toBe(true);
    expect((fetchImpl.mock.calls[0]![1].headers as Record<string, string>)['If-Modified-Since']).toBeDefined();
  });
  it('parses Link headers', () => {
    expect(parseNextLink('<a>; rel="prev", <b>; rel="next"')).toBe('b');
    expect(parseNextLink(null)).toBeNull();
  });
});

describe('notification urls', () => {
  const t = (url: string | null): NotificationThread => ({
    id: '1', unread: true, reason: 'mention', updated_at: '', last_read_at: null,
    subject: { title: 'x', url, latest_comment_url: null, type: 'PullRequest' },
    repository: { full_name: 'o/r', html_url: 'https://github.com/o/r', private: false },
  });
  it('maps API urls to web urls', () => {
    expect(threadHtmlUrl(t('https://api.github.com/repos/o/r/pulls/12'))).toBe('https://github.com/o/r/pull/12');
    expect(threadHtmlUrl(t('https://api.github.com/repos/o/r/issues/3'))).toBe('https://github.com/o/r/issues/3');
    expect(threadHtmlUrl(t('https://api.github.com/repos/o/r/commits/abc'))).toBe('https://github.com/o/r/commit/abc');
    expect(threadHtmlUrl(t(null))).toBe('https://github.com/o/r');
  });
  it('only trusts github.com links for alert clicks', () => {
    expect(isGitHubUrl('https://github.com/o/r')).toBe(true);
    expect(isGitHubUrl('https://evil.example/https://github.com/')).toBe(false);
  });
});

describe('settings', () => {
  it('fills defaults and rejects bad values', () => {
    const s = normalizeSettings({ pollMinutes: 7, pinned: ['a/b', 3 as unknown as string] });
    expect(s.pollMinutes).toBe(DEFAULT_SETTINGS.pollMinutes);
    expect(s.pinned).toEqual(['a/b']);
    expect(s.overviewSections.pulse).toBe(true);
  });
});
