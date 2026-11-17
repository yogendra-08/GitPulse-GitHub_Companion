import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookMarked, ExternalLink, Monitor, Moon, RefreshCw, Search, Sun, UserRound } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { CommandPalette, type Command } from '@/components/CommandPalette';
import { ConnectPanel } from '@/components/ConnectPanel';
import { IconButton } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/features/data/DataProvider';
import { useFetchStatus } from '@/features/data/fetchStore';
import { useNotifications, usePullRequests, useRepos } from '@/features/data/queries';
import { useSettings } from '@/features/SettingsProvider';
import { useHotkeys } from '@/hooks/useHotkeys';
import { nextTheme } from '@/hooks/useTheme';
import { openUrl } from '@/lib/open';
import { timeAgo } from '@/lib/time';
import { GITHUB_URL, NAV } from './nav';

function useTicker(ms: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return tick;
}

const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

function Sidebar() {
  const { user, notifications } = useAuth();
  const unread = useNotifications(false);
  const reviews = usePullRequests('review-requested', 'open');
  const unreadCount = notifications.supported ? (unread.data?.filter((t) => t.unread).length ?? 0) : 0;
  const reviewCount = reviews.data?.total_count ?? 0;
  const counts: Record<string, number> = { '/notifications': unreadCount, '/pulls': reviewCount };

  return (
    <aside className="sticky top-0 flex h-screen w-14 shrink-0 flex-col border-r border-line bg-surface lg:w-56">
      <div className="flex h-12 items-center gap-2.5 px-3.5">
        <Logo />
        <span className="hidden text-sm font-semibold tracking-tight lg:inline">GitPulse</span>
      </div>
      <nav aria-label="Primary" className="flex-1 space-y-0.5 px-2 py-2">
        {NAV.map(({ path, label, icon: Icon, key }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            title={`${label} (g then ${key})`}
            className={({ isActive }) =>
              `relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors ${
                isActive ? 'bg-raised text-ink before:absolute before:-left-2 before:h-4 before:w-[2px] before:rounded-full before:bg-accent' : 'text-muted hover:bg-raised hover:text-ink'
              }`
            }
          >
            <Icon aria-hidden size={16} className="shrink-0" />
            <span className="hidden flex-1 truncate lg:inline">{label}</span>
            {!!counts[path] && (
              <span className="num hidden rounded bg-accent/15 px-1.5 text-xs text-accent lg:inline" aria-label={`${counts[path]} waiting`}>
                {counts[path]}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      {user && (
        <a
          href={user.html_url}
          target="_blank"
          rel="noreferrer"
          className="m-2 flex items-center gap-2.5 rounded-md p-1.5 text-sm text-muted transition-colors hover:bg-raised hover:text-ink"
          title="Open your GitHub profile"
        >
          <Avatar src={user.avatar_url} name={user.login} size={24} />
          <span className="hidden min-w-0 flex-1 truncate lg:inline">{user.login}</span>
        </a>
      )}
    </aside>
  );
}

function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { refreshAll } = useData();
  const { pending, lastSyncedAt } = useFetchStatus();
  const { settings, update } = useSettings();
  useTicker(30_000);
  const ThemeIcon = THEME_ICON[settings.theme];
  const isMac = /mac/i.test(navigator.platform);

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-line bg-bg/90 px-6 backdrop-blur">
      <button
        type="button"
        onClick={onOpenPalette}
        className="flex h-8 w-full max-w-sm items-center gap-2 rounded-md border border-line-strong bg-surface px-2.5 text-sm text-faint transition-colors hover:text-muted"
      >
        <Search aria-hidden size={14} />
        <span className="flex-1 text-left">Search or jump to</span>
        <kbd className="font-mono text-[11px]">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <div className="flex-1" />
      <span className="hidden text-xs text-muted sm:inline" aria-live="polite">
        {pending > 0 ? 'Syncing…' : lastSyncedAt ? `Updated ${timeAgo(lastSyncedAt)}` : ''}
      </span>
      <IconButton label="Refresh all data (r)" onClick={refreshAll}>
        <RefreshCw size={15} className={pending > 0 ? 'animate-[spin_1s_linear_infinite]' : ''} />
      </IconButton>
      <IconButton label={`Theme: ${settings.theme} (t to change)`} onClick={() => update({ theme: nextTheme(settings.theme) })}>
        <ThemeIcon size={15} />
      </IconButton>
    </header>
  );
}

export function AppShell() {
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, update } = useSettings();
  const { refreshAll } = useData();
  const repos = useRepos();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const go = useCallback(
    (key: string) => {
      const target = NAV.find((n) => n.key === key);
      if (target) navigate(target.path);
    },
    [navigate],
  );

  useHotkeys({
    openPalette: () => setPaletteOpen(true),
    go,
    refresh: refreshAll,
    toggleTheme: () => update({ theme: nextTheme(settings.theme) }),
  });

  // Move focus to the page heading after navigation so keyboard and screen-reader users land in the new content.
  useEffect(() => {
    document.querySelector<HTMLElement>('main h1')?.setAttribute('tabindex', '-1');
  }, [location.pathname]);

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = NAV.map((n) => ({
      id: `go:${n.path}`,
      group: 'Go to',
      label: n.label,
      hint: `g ${n.key}`,
      icon: <n.icon size={15} />,
      run: () => navigate(n.path),
    }));
    list.push(
      { id: 'a:refresh', group: 'Actions', label: 'Refresh all data', hint: 'r', icon: <RefreshCw size={15} />, run: refreshAll },
      { id: 'a:theme', group: 'Actions', label: 'Change theme', hint: 't', icon: <Sun size={15} />, keywords: 'dark light appearance', run: () => update({ theme: nextTheme(settings.theme) }) },
      { id: 'a:gh', group: 'Actions', label: 'Open GitHub', icon: <ExternalLink size={15} />, run: () => openUrl(GITHUB_URL) },
    );
    if (user) list.push({ id: 'a:profile', group: 'Actions', label: 'Open my GitHub profile', icon: <UserRound size={15} />, run: () => openUrl(user.html_url) });
    for (const r of repos.data ?? []) {
      list.push({ id: `repo:${r.id}`, group: 'Repositories', label: r.full_name, icon: <BookMarked size={15} />, keywords: r.description ?? '', run: () => openUrl(r.html_url) });
    }
    return list;
  }, [navigate, refreshAll, update, settings.theme, user, repos.data]);

  const fromQuery = useCallback(
    (q: string): Command => ({
      id: 'search:gh',
      group: 'Search',
      label: `Search GitHub for “${q}”`,
      icon: <Search size={15} />,
      run: () => openUrl(`${GITHUB_URL}/search?q=${encodeURIComponent(q)}`),
    }),
    [],
  );

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted">Loading…</div>;
  }

  if (status === 'signed_out' || status === 'invalid') {
    return (
      <div className="min-h-screen px-6 py-16">
        <div className="mx-auto mb-10 flex max-w-xl items-center gap-2.5">
          <Logo size={26} />
          <span className="text-base font-semibold tracking-tight">GitPulse</span>
          <span className="text-sm text-muted">Your GitHub activity, one pulse away.</span>
        </div>
        <ConnectPanel invalid={status === 'invalid'} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenPalette={() => setPaletteOpen(true)} />
        <main className="mx-auto w-full max-w-[1080px] flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} fromQuery={fromQuery} />
    </div>
  );
}
