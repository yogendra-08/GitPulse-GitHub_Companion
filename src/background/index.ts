/**
 * GitPulse background service worker (Manifest V3).
 *
 * Responsibilities:
 *  - poll GitHub notifications on an alarm (using If-Modified-Since so unchanged
 *    polls are free and don't touch the rate limit)
 *  - keep the toolbar badge in sync with the unread count
 *  - raise desktop alerts for new notifications, per the user's preferences
 *
 * Nothing here runs unless the user connected a token that GitHub allows to read
 * notifications (classic token with the notifications or repo scope).
 */
import { clearAuthBadgeState, loadAuth, notificationsCapability } from '@/shared/auth';
import { GitHubClient, isGitHubError } from '@/shared/github/client';
import { listNotifications } from '@/shared/github/api';
import { isDirect, isGitHubUrl, isMention, isReviewRequest, reasonLabel, threadHtmlUrl } from '@/shared/notifications';
import { loadSettings, type Settings } from '@/shared/settings';
import { KEYS, onStorageChange, storageGet, storageRemove, storageSet } from '@/shared/storage';
import type { NotificationThread } from '@/shared/types';
import { MESSAGE, type ExtensionMessage } from '@/shared/messages';

const ALARM = 'gitpulse-poll';
const MAX_ALERTS_PER_POLL = 3;

async function setBadge(count: number | '!' | null, enabled: boolean): Promise<void> {
  if (!enabled || count === null || count === 0) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }
  const text = count === '!' ? '!' : count >= 50 ? '50+' : String(count);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: '#E8A23A' });
  // Not available in every Chrome version; the default white text is acceptable.
  await chrome.action.setBadgeTextColor?.({ color: '#181104' });
}

function wantsAlert(t: NotificationThread, mode: Settings['desktopAlerts']): boolean {
  if (mode === 'off') return false;
  if (mode === 'all') return true;
  return isMention(t) || isReviewRequest(t) || isDirect(t);
}

async function raiseAlerts(fresh: NotificationThread[], mode: Settings['desktopAlerts']): Promise<void> {
  const eligible = fresh.filter((t) => wantsAlert(t, mode));
  for (const t of eligible.slice(0, MAX_ALERTS_PER_POLL)) {
    await chrome.notifications.create(threadHtmlUrl(t), {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: t.repository.full_name,
      message: t.subject.title,
      contextMessage: reasonLabel(t.reason),
    });
  }
  const extra = eligible.length - MAX_ALERTS_PER_POLL;
  if (extra > 0) {
    await chrome.notifications.create('gitpulse-summary', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'GitPulse',
      message: `${extra} more new GitHub notification${extra === 1 ? '' : 's'}`,
    });
  }
}

let polling: Promise<void> | null = null;

/** Check notifications once. Concurrent calls share the same in-flight request. */
function poll(): Promise<void> {
  polling ??= doPoll().finally(() => {
    polling = null;
  });
  return polling;
}

async function doPoll(): Promise<void> {
  const [auth, settings] = await Promise.all([loadAuth(), loadSettings()]);
  if (!auth || !notificationsCapability(auth).supported) {
    await setBadge(null, false);
    return;
  }
  if (!settings.badge && settings.desktopAlerts === 'off') return;

  const client = new GitHubClient({ token: auth.token, retries: 0 });
  try {
    const lastModified = (await storageGet<string>(KEYS.lastModified)) ?? null;
    const res = await listNotifications(client, { all: false, ifModifiedSince: lastModified });
    if (res.notModified) return;

    const unread = res.threads.filter((t) => t.unread);
    const seenBefore = await storageGet<string[]>(KEYS.seen);
    const seen = new Set(seenBefore ?? []);
    const stamp = (t: NotificationThread) => `${t.id}:${t.updated_at}`;
    const fresh = unread.filter((t) => !seen.has(stamp(t)));

    // The first poll after connecting only establishes a baseline; it never alerts.
    if (seenBefore) await raiseAlerts(fresh, settings.desktopAlerts);

    await storageSet(KEYS.seen, unread.map(stamp).slice(0, 500));
    await storageSet(KEYS.badge, unread.length);
    if (res.lastModified) await storageSet(KEYS.lastModified, res.lastModified);
    await setBadge(unread.length, settings.badge);
  } catch (e) {
    if (isGitHubError(e) && e.kind === 'unauthorized') {
      await setBadge('!', true);
    }
    // Network errors and rate limits: keep the last badge and try again next alarm.
  }
}

async function schedule(): Promise<void> {
  const [auth, settings] = await Promise.all([loadAuth(), loadSettings()]);
  const active = !!auth && notificationsCapability(auth).supported && (settings.badge || settings.desktopAlerts !== 'off');
  if (!active) {
    await chrome.alarms.clear(ALARM);
    await setBadge(null, false);
    return;
  }
  await chrome.alarms.create(ALARM, { periodInMinutes: settings.pollMinutes, delayInMinutes: 0.2 });
}

// Listeners must be registered synchronously at the top level of the worker.
chrome.runtime.onInstalled.addListener((details) => {
  void schedule();
  if (details.reason === 'install') {
    void chrome.tabs.create({ url: chrome.runtime.getURL('app.html') });
  }
});

chrome.runtime.onStartup.addListener(() => {
  void schedule().then(poll);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) void poll();
});

chrome.notifications.onClicked.addListener((id) => {
  if (isGitHubUrl(id)) void chrome.tabs.create({ url: id });
  void chrome.notifications.clear(id);
});

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message?.type === MESSAGE.pollNow) {
    // Something changed (e.g. the user marked threads as read): skip the 304 shortcut.
    void storageRemove(KEYS.lastModified)
      .then(poll)
      .then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

onStorageChange((changes) => {
  if (KEYS.auth in changes) {
    const signedOut = !changes[KEYS.auth]?.newValue;
    if (signedOut) void clearAuthBadgeState().then(() => setBadge(null, false));
    void storageRemove(KEYS.lastModified).then(schedule).then(() => (signedOut ? undefined : poll()));
  }
  if (KEYS.settings in changes) {
    void storageRemove(KEYS.lastModified).then(schedule).then(poll);
  }
});
