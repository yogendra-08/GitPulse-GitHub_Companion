import { KEYS, storageGet, storageSet } from './storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type DesktopAlerts = 'off' | 'mentions' | 'all';
export type OverviewSection = 'attention' | 'pulse' | 'activity' | 'repos';

export interface Settings {
  theme: ThemePreference;
  /** Background check interval in minutes. */
  pollMinutes: number;
  /** Which new notifications trigger a desktop alert. */
  desktopAlerts: DesktopAlerts;
  /** Show the unread count on the toolbar icon. */
  badge: boolean;
  /** Pinned repositories (full names, e.g. "owner/name"). */
  pinned: string[];
  overviewSections: Record<OverviewSection, boolean>;
}

export const POLL_OPTIONS = [1, 5, 10, 15, 30] as const;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  pollMinutes: 5,
  desktopAlerts: 'mentions',
  badge: true,
  pinned: [],
  overviewSections: { attention: true, pulse: true, activity: true, repos: true },
};

/** Merge stored (possibly older/partial) settings over the defaults. */
export function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  const r = raw ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...r,
    pollMinutes: POLL_OPTIONS.includes(r.pollMinutes as (typeof POLL_OPTIONS)[number])
      ? (r.pollMinutes as number)
      : DEFAULT_SETTINGS.pollMinutes,
    pinned: Array.isArray(r.pinned) ? r.pinned.filter((p) => typeof p === 'string') : [],
    overviewSections: { ...DEFAULT_SETTINGS.overviewSections, ...(r.overviewSections ?? {}) },
  };
}

export async function loadSettings(): Promise<Settings> {
  return normalizeSettings(await storageGet<Partial<Settings>>(KEYS.settings));
}

export async function saveSettings(settings: Settings): Promise<void> {
  await storageSet(KEYS.settings, settings);
}
