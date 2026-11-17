import { useSyncExternalStore } from 'react';
import type { RateLimit } from '@/shared/types';

/** Last rate-limit headers seen from GitHub, shared across the UI. */
let current: RateLimit | null = null;
const listeners = new Set<() => void>();

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

function setRate(r: RateLimit) {
  // Only the "core" and "search" buckets matter to users; keep whichever was seen last.
  current = r;
  listeners.forEach((l) => l());
}

/** Selector-style hook; keeps call sites tidy (`useRateLimitStore(s => s.set)`). */
export function useRateLimitStore<T>(select: (s: { rate: RateLimit | null; set: (r: RateLimit) => void }) => T): T {
  const rate = useSyncExternalStore(subscribe, () => current);
  return select({ rate, set: setRate });
}
