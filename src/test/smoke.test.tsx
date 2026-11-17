// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Providers } from '@/app/Providers';
import { PopupApp } from '@/popup/PopupApp';
import { KEYS } from '@/shared/storage';
import type { AuthRecord } from '@/shared/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const user = { login: 'ada', id: 1, avatar_url: '', html_url: 'https://github.com/ada', name: 'Ada Lovelace', bio: null, company: null, location: null, public_repos: 3, followers: 2, following: 1, created_at: '2020-01-01T00:00:00Z' };

const json = (body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status: 200, headers });

function mockGitHub() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === '/search/issues') {
      const q = url.searchParams.get('q') ?? '';
      const items = q.includes('is:issue')
        ? [{ id: 2, number: 7, title: 'Assigned bug', html_url: 'https://github.com/o/r/issues/7', state: 'open', user: { login: 'bob', avatar_url: '' }, labels: [], assignees: [], comments: 0, created_at: '2026-01-01T00:00:00Z', updated_at: new Date().toISOString(), closed_at: null, repository_url: 'https://api.github.com/repos/o/r' }]
        : q.includes('review-requested')
          ? [{ id: 1, number: 3, title: 'Please review me', html_url: 'https://github.com/o/r/pull/3', state: 'open', user: { login: 'bob', avatar_url: '' }, labels: [], assignees: [], comments: 0, created_at: '2026-01-01T00:00:00Z', updated_at: new Date().toISOString(), closed_at: null, repository_url: 'https://api.github.com/repos/o/r', pull_request: { merged_at: null, html_url: '' } }]
          : [];
      return json({ total_count: items.length, incomplete_results: false, items });
    }
    if (url.pathname === '/notifications') return json([]);
    if (url.pathname === '/user') return json(user);
    return json([]);
  });
}

describe('popup smoke test', () => {
  let container: HTMLDivElement;
  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  afterEach(() => container.remove());

  it('asks signed-out users to set up in the dashboard', async () => {
    await act(async () => createRoot(container).render(<Providers><PopupApp /></Providers>));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(container.textContent).toContain('Connect GitHub');
    expect(container.textContent).toContain('Set up in dashboard');
  });

  it('shows prioritized attention items for a connected user', async () => {
    const auth: AuthRecord = { token: 'ghp_' + 'a'.repeat(36), kind: 'classic', scopes: ['repo', 'notifications'], user, verifiedAt: Date.now() };
    localStorage.setItem(KEYS.auth, JSON.stringify(auth));
    vi.stubGlobal('fetch', mockGitHub());
    await act(async () => createRoot(container).render(<Providers><PopupApp /></Providers>));
    await act(async () => { await new Promise((r) => setTimeout(r, 150)); });
    expect(container.textContent).toContain('Ada Lovelace');
    expect(container.textContent).toContain('Please review me');
    expect(container.textContent).toContain('Needs your review');
    expect(container.textContent).toContain('Assigned bug');
  });
});
