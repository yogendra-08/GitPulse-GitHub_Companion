import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { checkTokenFormat, clearAuth, detectTokenKind, loadAuth, notificationsCapability, saveAuth, type Capability } from '@/shared/auth';
import { cacheClearAll } from '@/shared/cache';
import { getAuthenticatedUser } from '@/shared/github/api';
import { GitHubClient, isGitHubError } from '@/shared/github/client';
import { onStorageChange, KEYS } from '@/shared/storage';
import type { AuthRecord, GitHubUser, RateLimit } from '@/shared/types';
import { useRateLimitStore } from './rateLimit';

export type AuthStatus = 'loading' | 'signed_out' | 'ready' | 'invalid';

interface AuthContextValue {
  status: AuthStatus;
  auth: AuthRecord | null;
  user: GitHubUser | null;
  client: GitHubClient | null;
  notifications: Capability;
  /** Validates the token against GitHub, then stores it. Returns an error message on failure. */
  connect: (rawToken: string) => Promise<string | null>;
  disconnect: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const REVERIFY_AFTER_MS = 10 * 60_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [auth, setAuth] = useState<AuthRecord | null>(null);
  const setRate = useRateLimitStore((s) => s.set);
  const rateRef = useRef(setRate);
  rateRef.current = setRate;

  const makeClient = useCallback(
    (token: string) =>
      new GitHubClient({
        token,
        onUnauthorized: () => setStatus('invalid'),
        onRateLimit: (r: RateLimit) => rateRef.current(r),
      }),
    [],
  );

  const client = useMemo(() => (auth ? makeClient(auth.token) : null), [auth, makeClient]);

  // Initial load: show the stored profile immediately, re-verify quietly if it is old.
  useEffect(() => {
    let cancelled = false;
    void loadAuth().then(async (stored) => {
      if (cancelled) return;
      if (!stored) {
        setStatus('signed_out');
        return;
      }
      setAuth(stored);
      setStatus('ready');
      if (Date.now() - stored.verifiedAt < REVERIFY_AFTER_MS) return;
      try {
        const { user, scopes } = await getAuthenticatedUser(makeClient(stored.token));
        if (cancelled) return;
        const next = { ...stored, user, scopes, verifiedAt: Date.now() };
        await saveAuth(next);
        setAuth(next);
      } catch (e) {
        if (!cancelled && isGitHubError(e) && e.kind === 'unauthorized') setStatus('invalid');
        // Other errors (offline, rate limit) shouldn't lock the user out of cached data.
      }
    });
    return () => {
      cancelled = true;
    };
  }, [makeClient]);

  // Stay in sync when another extension page connects or disconnects.
  useEffect(
    () =>
      onStorageChange((changes) => {
        if (!(KEYS.auth in changes)) return;
        const next = changes[KEYS.auth]?.newValue as AuthRecord | undefined;
        if (next) {
          setAuth(next);
          setStatus('ready');
        } else {
          setAuth(null);
          setStatus('signed_out');
        }
      }),
    [],
  );

  const connect = useCallback(
    async (rawToken: string): Promise<string | null> => {
      const checked = checkTokenFormat(rawToken);
      if (!checked.ok) return checked.message;
      try {
        const { user, scopes } = await getAuthenticatedUser(
          new GitHubClient({ token: checked.token, retries: 0 }),
        );
        const record: AuthRecord = {
          token: checked.token,
          kind: detectTokenKind(checked.token),
          scopes,
          user,
          verifiedAt: Date.now(),
        };
        await cacheClearAll();
        await saveAuth(record);
        setAuth(record);
        setStatus('ready');
        return null;
      } catch (e) {
        if (isGitHubError(e)) {
          if (e.kind === 'unauthorized') return 'GitHub didn\u2019t accept this token. Check that you copied all of it and that it hasn\u2019t expired.';
          return e.message;
        }
        return 'Something went wrong while checking the token.';
      }
    },
    [],
  );

  const disconnect = useCallback(async () => {
    await clearAuth();
    await cacheClearAll();
    setAuth(null);
    setStatus('signed_out');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      auth,
      user: auth?.user ?? null,
      client,
      notifications: auth ? notificationsCapability(auth) : { supported: false },
      connect,
      disconnect,
    }),
    [status, auth, client, connect, disconnect],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
