import type { RateLimit } from '../types';

export type GitHubErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'not_found'
  | 'validation'
  | 'server'
  | 'network'
  | 'graphql'
  | 'unknown';

export class GitHubError extends Error {
  readonly kind: GitHubErrorKind;
  readonly status: number | null;
  /** Epoch ms when a rate limit lifts, when known. */
  readonly resetAt: number | null;

  constructor(kind: GitHubErrorKind, message: string, status: number | null = null, resetAt: number | null = null) {
    super(message);
    this.name = 'GitHubError';
    this.kind = kind;
    this.status = status;
    this.resetAt = resetAt;
  }

  /** Errors where trying again later (or right now) can plausibly succeed. */
  get retryable(): boolean {
    return this.kind === 'network' || this.kind === 'server' || this.kind === 'rate_limited';
  }
}

export const isGitHubError = (e: unknown): e is GitHubError => e instanceof GitHubError;

export interface ClientOptions {
  token: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  /** Called when GitHub answers 401, so the UI can ask the user to reconnect. */
  onUnauthorized?: () => void;
  onRateLimit?: (rate: RateLimit) => void;
  /** Retries for network failures and 5xx on GET requests. */
  retries?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
  notModified: boolean;
}

const API_VERSION = '2022-11-28';

/** Extract the `rel="next"` URL from a Link header. */
export function parseNextLink(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(',')) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (m && m[1]) return m[1];
  }
  return null;
}

export function readRateLimit(headers: Headers): RateLimit | null {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  if (limit == null || remaining == null || reset == null) return null;
  return {
    limit: Number(limit),
    remaining: Number(remaining),
    resetAt: Number(reset) * 1000,
    resource: headers.get('x-ratelimit-resource') ?? 'core',
  };
}

/** Turn a failed HTTP response into a GitHubError with a message a person can act on. */
export function errorFromResponse(status: number, headers: Headers, body: unknown): GitHubError {
  const apiMessage =
    body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string'
      ? (body as { message: string }).message
      : '';
  const rate = readRateLimit(headers);
  const retryAfter = headers.get('retry-after');

  if (status === 401) {
    return new GitHubError(
      'unauthorized',
      'GitHub rejected this token. It may have expired, been revoked, or been mistyped.',
      status,
    );
  }

  const looksRateLimited =
    (status === 403 || status === 429) &&
    (rate?.remaining === 0 || retryAfter != null || /rate limit|abuse|secondary/i.test(apiMessage));
  if (looksRateLimited) {
    const resetAt = retryAfter ? Date.now() + Number(retryAfter) * 1000 : (rate?.resetAt ?? null);
    return new GitHubError(
      'rate_limited',
      'GitHub\u2019s rate limit was reached. GitPulse will work again once the limit resets.',
      status,
      resetAt,
    );
  }

  if (status === 403) {
    return new GitHubError(
      'forbidden',
      apiMessage
        ? `GitHub denied this request: ${apiMessage}`
        : 'Your token doesn\u2019t have permission for this. Check its scopes or repository access.',
      status,
    );
  }
  if (status === 404) {
    return new GitHubError(
      'not_found',
      'GitHub couldn\u2019t find this resource. For private data, 404 usually means the token lacks access.',
      status,
    );
  }
  if (status === 422) {
    return new GitHubError('validation', apiMessage || 'GitHub could not process this request.', status);
  }
  if (status >= 500) {
    return new GitHubError('server', 'GitHub is having trouble right now. Try again in a moment.', status);
  }
  return new GitHubError('unknown', apiMessage || `Unexpected response from GitHub (${status}).`, status);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class GitHubClient {
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  private readonly opts: ClientOptions;

  constructor(opts: ClientOptions) {
    this.opts = opts;
    this.token = opts.token;
    this.fetchImpl = opts.fetchImpl ?? ((...args) => fetch(...args));
    this.baseUrl = opts.baseUrl ?? 'https://api.github.com';
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const method = options.method ?? 'GET';
    const url = new URL(path.startsWith('http') ? path : this.baseUrl + path);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${this.token}`,
      'X-GitHub-Api-Version': API_VERSION,
      ...options.headers,
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';

    const maxAttempts = method === 'GET' ? (this.opts.retries ?? 1) + 1 : 1;
    let lastError: GitHubError | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) await sleep(400 * attempt);
      let res: Response;
      try {
        res = await this.fetchImpl(url.toString(), {
          method,
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: options.signal,
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') throw e;
        lastError = new GitHubError('network', 'Can\u2019t reach GitHub. Check your internet connection and try again.');
        continue;
      }

      const rate = readRateLimit(res.headers);
      if (rate) this.opts.onRateLimit?.(rate);

      if (res.status === 304) {
        return { data: undefined as T, status: 304, headers: res.headers, notModified: true };
      }

      let body: unknown = null;
      const text = await res.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = null;
        }
      }

      if (res.ok) {
        return { data: body as T, status: res.status, headers: res.headers, notModified: false };
      }

      const err = errorFromResponse(res.status, res.headers, body);
      if (err.kind === 'unauthorized') this.opts.onUnauthorized?.();
      if (err.kind === 'server') {
        lastError = err;
        continue;
      }
      throw err;
    }
    throw lastError ?? new GitHubError('unknown', 'Request failed.');
  }

  async get<T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal): Promise<T> {
    return (await this.request<T>(path, { query, signal })).data;
  }

  /**
   * Follow `Link: rel="next"` pages, up to `maxPages`. `extract` lets callers
   * unwrap envelope responses (e.g. search results).
   */
  async paginate<T>(
    path: string,
    query: RequestOptions['query'] = {},
    maxPages = 5,
    signal?: AbortSignal,
  ): Promise<T[]> {
    const out: T[] = [];
    let next: string | null = path;
    let first = true;
    for (let page = 0; page < maxPages && next; page++) {
      const res: ApiResponse<T[]> = await this.request<T[]>(next, { query: first ? { per_page: 100, ...query } : undefined, signal });
      first = false;
      out.push(...res.data);
      next = parseNextLink(res.headers.get('link'));
    }
    return out;
  }

  async graphql<T>(query: string, variables: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
    const res = await this.request<{ data?: T; errors?: { message: string; type?: string }[] }>('/graphql', {
      method: 'POST',
      body: { query, variables },
      signal,
    });
    const { data, errors } = res.data;
    if (errors?.length || !data) {
      const first = errors?.[0];
      const forbidden = first?.type === 'FORBIDDEN' || /scope|permission|resource not accessible/i.test(first?.message ?? '');
      throw new GitHubError(
        forbidden ? 'forbidden' : 'graphql',
        first?.message ?? 'GitHub returned an empty GraphQL response.',
        res.status,
      );
    }
    return data;
  }
}
