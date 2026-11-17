import { useSyncExternalStore } from 'react';

/** Tiny global store: how many requests are in flight and when data last synced. */
interface Snapshot {
  pending: number;
  lastSyncedAt: number | null;
}

let snapshot: Snapshot = { pending: 0, lastSyncedAt: null };
const listeners = new Set<() => void>();

const set = (next: Snapshot) => {
  snapshot = next;
  listeners.forEach((l) => l());
};

export const fetchStore = {
  start: () => set({ ...snapshot, pending: snapshot.pending + 1 }),
  finish: (ok: boolean) =>
    set({ pending: Math.max(0, snapshot.pending - 1), lastSyncedAt: ok ? Date.now() : snapshot.lastSyncedAt }),
};

export function useFetchStatus(): Snapshot {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
  );
}
