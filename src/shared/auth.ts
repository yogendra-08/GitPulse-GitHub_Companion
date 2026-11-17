import type { AuthRecord, TokenKind } from './types';
import { KEYS, storageGet, storageRemove, storageSet } from './storage';

export function detectTokenKind(token: string): TokenKind {
  if (token.startsWith('github_pat_')) return 'fine-grained';
  if (token.startsWith('ghp_')) return 'classic';
  return 'unknown';
}

/** Cheap client-side sanity check so we can give instant feedback before any network call. */
export function checkTokenFormat(raw: string): { ok: true; token: string } | { ok: false; message: string } {
  const token = raw.trim();
  if (!token) return { ok: false, message: 'Paste a personal access token to continue.' };
  if (/\s/.test(token)) return { ok: false, message: 'The token contains spaces or line breaks. Copy it again without them.' };
  if (token.length < 20) return { ok: false, message: 'That looks too short to be a GitHub token.' };
  if (!/^[A-Za-z0-9_]+$/.test(token)) return { ok: false, message: 'Tokens only contain letters, numbers and underscores.' };
  return { ok: true, token };
}

export interface Capability {
  supported: boolean;
  /** Shown to the user when `supported` is false. */
  reason?: string;
}

/**
 * The notifications endpoints only accept classic tokens that carry the
 * `notifications` or `repo` scope. We never pretend otherwise.
 */
export function notificationsCapability(auth: Pick<AuthRecord, 'kind' | 'scopes'>): Capability {
  if (auth.kind === 'fine-grained') {
    return {
      supported: false,
      reason:
        'GitHub\u2019s notifications API does not accept fine-grained tokens. Connect a classic token with the notifications scope to use this page.',
    };
  }
  if (auth.scopes && !auth.scopes.includes('notifications') && !auth.scopes.includes('repo')) {
    return {
      supported: false,
      reason: 'Your classic token is missing the notifications scope. Create a new token that includes it, then reconnect.',
    };
  }
  return { supported: true };
}

export async function loadAuth(): Promise<AuthRecord | undefined> {
  return storageGet<AuthRecord>(KEYS.auth);
}

export async function saveAuth(auth: AuthRecord): Promise<void> {
  await storageSet(KEYS.auth, auth);
}

export async function clearAuth(): Promise<void> {
  await storageRemove(KEYS.auth, KEYS.badge, KEYS.seen, KEYS.lastModified);
}

/** Reset notification bookkeeping (used by the background worker on sign-out). */
export async function clearAuthBadgeState(): Promise<void> {
  await storageRemove(KEYS.badge, KEYS.seen, KEYS.lastModified);
}
