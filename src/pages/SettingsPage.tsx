import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { ConnectPanel } from '@/components/ConnectPanel';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Segmented, Select, Toggle } from '@/components/ui/Controls';
import { Avatar } from '@/components/ui/Avatar';
import { Panel } from '@/components/ui/Panel';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRateLimitStore } from '@/features/auth/rateLimit';
import { useSettings } from '@/features/SettingsProvider';
import { cacheClearAll } from '@/shared/cache';
import { POLL_OPTIONS, type DesktopAlerts, type OverviewSection, type ThemePreference } from '@/shared/settings';
import { timeUntil } from '@/lib/time';

const SECTION_LABELS: Record<OverviewSection, string> = {
  attention: 'Needs your attention',
  pulse: 'Pulse',
  activity: 'Recent activity',
  repos: 'Pinned and recent repositories',
};

const SHORTCUTS: [string, string][] = [
  ['⌘/Ctrl K', 'Open the command palette'],
  ['/', 'Focus the search box on the current page'],
  ['g then o, p, i, n, r, a, s', 'Go to Overview, Pull requests, Issues, Notifications, Repositories, Analytics, Settings'],
  ['r', 'Refresh all data'],
  ['t', 'Change theme'],
];

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-2.5">
      <div>
        <div className="text-sm">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage({ standalone = false }: { standalone?: boolean }) {
  const { status, auth, user, notifications, disconnect } = useAuth();
  const { settings, update, togglePinned } = useSettings();
  const rate = useRateLimitStore((s) => s.rate);
  const [cleared, setCleared] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (status === 'loading') return null;
  if (status !== 'ready' || !auth || !user) {
    return (
      <div className={standalone ? 'px-6 py-12' : ''}>
        <ConnectPanel invalid={status === 'invalid'} />
      </div>
    );
  }

  return (
    <div className={standalone ? 'mx-auto max-w-[760px] px-6 py-8' : 'max-w-[760px]'}>
      <PageHeader title="Settings" />
      <div className="space-y-5">
        <Panel title="GitHub account">
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar_url} name={user.login} size={36} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{user.name ?? user.login}</div>
              <div className="font-mono text-xs text-muted">@{user.login}</div>
            </div>
            {!confirm ? (
              <Button variant="danger" onClick={() => setConfirm(true)}>Disconnect</Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Remove the token from this browser?</span>
                <Button variant="danger" size="sm" onClick={() => void disconnect()}>Disconnect</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>Cancel</Button>
              </div>
            )}
          </div>
          <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-1.5 text-sm">
            <dt className="text-muted">Token type</dt>
            <dd>{auth.kind === 'classic' ? 'Classic' : auth.kind === 'fine-grained' ? 'Fine-grained' : 'Unrecognized format'}</dd>
            <dt className="text-muted">Scopes</dt>
            <dd className="font-mono text-xs">{auth.scopes ? auth.scopes.join(', ') || 'none' : 'Not reported by GitHub for this token type'}</dd>
            <dt className="text-muted">Notifications</dt>
            <dd>{notifications.supported ? 'Available' : 'Unavailable'}</dd>
            <dt className="text-muted">Rate limit</dt>
            <dd className="num">{rate ? `${rate.remaining} of ${rate.limit} requests left (${rate.resource}), resets in ${timeUntil(rate.resetAt)}` : 'Shown after the first request'}</dd>
          </dl>
          <p className="mt-4 text-xs text-muted">
            Disconnecting deletes the token and cached data from this browser. To fully revoke it, delete it on GitHub:{' '}
            <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
              token settings <ExternalLink size={11} aria-hidden />
            </a>
          </p>
        </Panel>

        <Panel title="Notifications">
          {!notifications.supported && <p className="mb-2 text-sm text-muted">{notifications.reason ?? 'Connect a classic token to enable these.'}</p>}
          <fieldset disabled={!notifications.supported} className="divide-y divide-line disabled:opacity-50">
            <Row label="Toolbar badge" hint="Show the unread count on the GitPulse icon">
              <Toggle label="Show badge" checked={settings.badge} onChange={(badge) => update({ badge })} />
            </Row>
            <Row label="Desktop alerts" hint="Which new notifications show a Chrome notification">
              <Select<DesktopAlerts> label="Desktop alerts" value={settings.desktopAlerts} onChange={(desktopAlerts) => update({ desktopAlerts })} options={[{ value: 'off', label: 'Off' }, { value: 'mentions', label: 'Mentions, reviews and assignments' }, { value: 'all', label: 'All new notifications' }]} />
            </Row>
            <Row label="Check every" hint="How often the background worker asks GitHub">
              <Select label="Check interval" value={String(settings.pollMinutes)} onChange={(v) => update({ pollMinutes: Number(v) })} options={POLL_OPTIONS.map((m) => ({ value: String(m), label: `${m} min` }))} />
            </Row>
          </fieldset>
        </Panel>

        <Panel title="Appearance">
          <Row label="Theme">
            <Segmented<ThemePreference> label="Theme" value={settings.theme} onChange={(theme) => update({ theme })} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
          </Row>
          <div className="mt-1 border-t border-line pt-2">
            <div className="py-1 text-sm">Overview sections</div>
            {(Object.keys(SECTION_LABELS) as OverviewSection[]).map((k) => (
              <Toggle key={k} label={SECTION_LABELS[k]} checked={settings.overviewSections[k]} onChange={(v) => update({ overviewSections: { ...settings.overviewSections, [k]: v } })} />
            ))}
          </div>
        </Panel>

        <Panel title="Pinned repositories">
          {settings.pinned.length === 0 ? (
            <p className="text-sm text-muted">Pin repositories from the Repositories page and they will appear on your Overview.</p>
          ) : (
            <ul className="divide-y divide-line">
              {settings.pinned.map((p) => (
                <li key={p} className="flex items-center justify-between py-2">
                  <span className="font-mono text-xs">{p}</span>
                  <Button size="sm" variant="ghost" onClick={() => togglePinned(p)}>Unpin</Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Data">
          <Row label="Cached data" hint="GitPulse keeps recent API responses so pages open instantly. Clearing it only costs a refetch.">
            <Button onClick={() => void cacheClearAll().then(() => setCleared(true))}>{cleared ? 'Cleared' : 'Clear cache'}</Button>
          </Row>
        </Panel>

        <Panel title="Keyboard shortcuts">
          <dl className="space-y-2 text-sm">
            {SHORTCUTS.map(([k, d]) => (
              <div key={k} className="flex gap-4">
                <dt className="w-52 shrink-0 font-mono text-xs text-ink">{k}</dt>
                <dd className="text-muted">{d}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <p className="pb-6 text-xs text-muted">
          GitPulse {typeof chrome !== 'undefined' ? (chrome.runtime?.getManifest?.().version ?? '') : ''}{' '}
          <a className="hover:text-ink" href="https://github.com/yogendra-08/GitPulse-GitHub_Companion" target="_blank" rel="noreferrer">Source on GitHub</a>
        </p>
      </div>
    </div>
  );
}
