import type { Repo } from '@/shared/types';

export type RepoSort = 'updated' | 'stars' | 'name';
export type RepoVisibility = 'all' | 'public' | 'private';

export interface RepoFilters {
  query: string;
  visibility: RepoVisibility;
  language: string;
  sort: RepoSort;
  hideForks: boolean;
  hideArchived: boolean;
}

export const DEFAULT_REPO_FILTERS: RepoFilters = {
  query: '',
  visibility: 'all',
  language: 'all',
  sort: 'updated',
  hideForks: false,
  hideArchived: false,
};

export function filterRepos(repos: Repo[], f: RepoFilters): Repo[] {
  const q = f.query.trim().toLowerCase();
  const out = repos.filter((r) => {
    if (f.visibility === 'public' && r.private) return false;
    if (f.visibility === 'private' && !r.private) return false;
    if (f.language !== 'all' && r.language !== f.language) return false;
    if (f.hideForks && r.fork) return false;
    if (f.hideArchived && r.archived) return false;
    if (q && !(r.full_name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q))) return false;
    return true;
  });
  const pushed = (r: Repo) => Date.parse(r.pushed_at ?? r.updated_at);
  out.sort((a, b) => {
    if (f.sort === 'stars') return b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name);
    if (f.sort === 'name') return a.full_name.localeCompare(b.full_name);
    return pushed(b) - pushed(a);
  });
  return out;
}

export function languagesOf(repos: Repo[]): string[] {
  return [...new Set(repos.map((r) => r.language).filter((l): l is string => !!l))].sort((a, b) => a.localeCompare(b));
}

export interface LanguageShare {
  language: string;
  repos: number;
  share: number;
}

/**
 * Primary language per repository, counted by number of repositories.
 * This is not bytes of code: GitHub only reports one primary language per repo
 * here, and repos without one are reported separately rather than dropped.
 */
export function languageDistribution(repos: Repo[]): { shares: LanguageShare[]; unknown: number } {
  const counts = new Map<string, number>();
  let unknown = 0;
  for (const r of repos) {
    if (!r.language) unknown++;
    else counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
  }
  const known = repos.length - unknown;
  const shares = [...counts.entries()]
    .map(([language, n]) => ({ language, repos: n, share: known ? n / known : 0 }))
    .sort((a, b) => b.repos - a.repos || a.language.localeCompare(b.language));
  return { shares, unknown };
}
