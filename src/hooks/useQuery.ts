import { useCallback, useEffect, useRef, useState } from 'react';
import { cachePeek, cacheRead, cacheSubscribe, cacheWrite } from '@/shared/cache';
import { isGitHubError, GitHubError } from '@/shared/github/client';
import { useData } from '@/features/data/DataProvider';
import { fetchStore } from '@/features/data/fetchStore';

/** Share one in-flight request per cache key so duplicate hooks don't double the API calls. */
const inflight = new Map<string, Promise<unknown>>();
function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = run().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export interface QueryState<T> {
  data: T | undefined;
  error: GitHubError | Error | null;
  /** True only while there is nothing to show yet. */
  loading: boolean;
  /** True while a request is in flight, even if cached data is on screen. */
  fetching: boolean;
  updatedAt: number | null;
  refetch: () => void;
}

interface Options {
  /** How long cached data counts as fresh. */
  ttlMs: number;
  enabled?: boolean;
}

/**
 * Stale-while-revalidate data hook backed by extension storage.
 *  - cached data renders immediately (even across popup opens)
 *  - if the cache is older than `ttlMs`, or the user hits refresh, we refetch
 *  - a failed refetch keeps the stale data and exposes the error
 */
export function useQuery<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>, { ttlMs, enabled = true }: Options): QueryState<T> {
  const { refreshCount } = useData();
  const [localNonce, setLocalNonce] = useState(0);
  const initial = key ? cachePeek<T>(key) : undefined;
  const [data, setData] = useState<T | undefined>(initial?.data);
  const [updatedAt, setUpdatedAt] = useState<number | null>(initial?.at ?? null);
  const [error, setError] = useState<GitHubError | Error | null>(null);
  const [fetching, setFetching] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const seenNonce = useRef({ refresh: refreshCount, local: localNonce });

  useEffect(() => {
    if (!key || !enabled) return;
    const forced = seenNonce.current.refresh !== refreshCount || seenNonce.current.local !== localNonce;
    seenNonce.current = { refresh: refreshCount, local: localNonce };

    let active = true;

    void (async () => {
      const cached = await cacheRead<T>(key);
      if (!active) return;
      if (cached) {
        setData(cached.data);
        setUpdatedAt(cached.at);
        if (!forced && Date.now() - cached.at < ttlMs) {
          setError(null);
          return;
        }
      } else {
        setData(undefined);
        setUpdatedAt(null);
      }

      setFetching(true);
      fetchStore.start();
      try {
        // Requests are shared between components, so they are never aborted on unmount;
        // `active` just stops stale results from being applied.
        const fresh = await dedupe(key, () => fetcherRef.current(new AbortController().signal));
        if (!active) {
          fetchStore.finish(false);
          return;
        }
        const at = await cacheWrite(key, fresh);
        setData(fresh);
        setUpdatedAt(at);
        setError(null);
        fetchStore.finish(true);
      } catch (e) {
        fetchStore.finish(false);
        if (!active || (e instanceof DOMException && e.name === 'AbortError')) return;
        setError(isGitHubError(e) ? e : e instanceof Error ? e : new Error('Unknown error'));
      } finally {
        if (active) setFetching(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [key, enabled, ttlMs, refreshCount, localNonce]);

  // Pick up writes made by other components (e.g. marking a notification read).
  useEffect(() => {
    if (!key) return;
    return cacheSubscribe<T>(key, (entry) => {
      setData(entry.data);
      setUpdatedAt(entry.at);
    });
  }, [key]);

  const refetch = useCallback(() => setLocalNonce((n) => n + 1), []);
  return { data, error, loading: !!key && enabled && data === undefined && error === null, fetching, updatedAt, refetch };
}
