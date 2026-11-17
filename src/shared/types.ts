/** Minimal typings for the parts of the GitHub REST/GraphQL payloads GitPulse reads. */

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  pushed_at: string | null;
  updated_at: string;
  visibility?: 'public' | 'private' | 'internal';
  owner: { login: string; avatar_url: string };
}

export interface Label {
  name: string;
  color: string;
}

export interface Actor {
  login: string;
  avatar_url: string;
}

/** An item returned by GET /search/issues (covers both issues and pull requests). */
export interface SearchItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  draft?: boolean;
  user: Actor | null;
  labels: Label[];
  assignees: Actor[];
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  repository_url: string;
  pull_request?: { merged_at: string | null; html_url: string };
}

export interface SearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: SearchItem[];
}

export interface NotificationThread {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  last_read_at: string | null;
  subject: {
    title: string;
    url: string | null;
    latest_comment_url: string | null;
    type: string;
  };
  repository: { full_name: string; html_url: string; private: boolean };
}

export interface GitHubEvent {
  id: string;
  type: string;
  actor: { login: string };
  repo: { name: string };
  created_at: string;
  payload: {
    action?: string;
    ref?: string;
    ref_type?: string;
    pull_request?: { number: number; title: string; merged?: boolean; html_url: string };
    issue?: { number: number; title: string; html_url: string; pull_request?: unknown };
    review?: { state: string; html_url: string };
    comment?: { html_url: string };
    release?: { name: string | null; tag_name: string; html_url: string };
    forkee?: { full_name: string; html_url: string };
    number?: number;
  };
}

export interface Review {
  id: number;
  state: string;
  user: { login: string } | null;
  submitted_at?: string;
}

export interface ContributionDay {
  date: string;
  count: number;
}

export interface ContributionCalendar {
  total: number;
  days: ContributionDay[];
}

export type TokenKind = 'classic' | 'fine-grained' | 'unknown';

/** What we persist after a successful connection. */
export interface AuthRecord {
  token: string;
  kind: TokenKind;
  /** OAuth scopes from `x-oauth-scopes`. null for fine-grained tokens (GitHub doesn't send it). */
  scopes: string[] | null;
  user: GitHubUser;
  verifiedAt: number;
}

export interface RateLimit {
  limit: number;
  remaining: number;
  /** Epoch ms when the window resets. */
  resetAt: number;
  resource: string;
}
