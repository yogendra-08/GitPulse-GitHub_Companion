import { useState } from 'react';
import { ExternalLink, LayoutDashboard, RefreshCw, Settings } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { QueryBoundary } from '@/components/QueryBoundary';
import { NotificationRow } from '@/components/rows/NotificationRow';
import { IssueRow, PullRequestRow } from '@/components/rows/PullRows';
import { RepoRow } from '@/components/rows/RepoRow';
import { RowLink, Meta, RepoName } from '@/components/rows/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Controls';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/features/data/DataProvider';
import { useFetchStatus } from '@/features/data/fetchStore';
import { useIssues, useNotifications, usePullRequests, useRepos } from '@/features/data/queries';
import { useAttention } from '@/features/data/useAttention';
import { useSettings } from '@/features/SettingsProvider';
import { ATTENTION_LABELS } from '@/lib/attention';
import { dashboardUrl, openUrl } from '@/lib/open';
import { timeAgo } from '@/lib/time';
import { Badge } from '@/components/ui/Badge';

type Tab = 'attention' | 'pulls' | 'issues' | 'inbox' | 'repos';

function open(path: string) {
  openUrl(dashboardUrl(path));
  window.close();
}

function AttentionTab() {
  const a = useAttention();
  if (a.loading) return <ListSkeleton rows={5} compact />;
  if (a.error) return <ErrorState error={a.error} onRetry={a.refetch} compact />;
  if (!a.items.length) return <EmptyState title="Nothing is waiting on you">No review requests, requested changes or assigned issues.</EmptyState>;
  return (
    <div className="divide-y divide-line">
      {a.items.slice(0, 12).map((i) => (
        <RowLink key={i.id} href={i.url} compact>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium group-hover:underline">{i.title}</div>
            <div className="mt-1 flex items-center gap-3">
              <RepoName name={i.repo} />
              <Meta>{timeAgo(i.at)}</Meta>
            </div>
          </div>
          <Badge tone={i.reason === 'changes_requested' ? 'closed' : i.reason === 'review_requested' ? 'accent' : 'neutral'}>{ATTENTION_LABELS[i.reason]}</Badge>
        </RowLink>
      ))}
    </div>
  );
}

function PullsTab() {
  const q = usePullRequests('authored', 'open');
  return (
    <QueryBoundary query={q} compact skeleton={<ListSkeleton rows={5} compact />}>
      {(d) => (d.items.length ? <div className="divide-y divide-line">{d.items.slice(0, 12).map((i) => <PullRequestRow key={i.id} item={i} compact />)}</div> : <EmptyState title="No open pull requests">You have no open pull requests.</EmptyState>)}
    </QueryBoundary>
  );
}

function IssuesTab() {
  const q = useIssues('assigned', 'open');
  return (
    <QueryBoundary query={q} compact skeleton={<ListSkeleton rows={5} compact />}>
      {(d) => (d.items.length ? <div className="divide-y divide-line">{d.items.slice(0, 12).map((i) => <IssueRow key={i.id} item={i} compact />)}</div> : <EmptyState title="No assigned issues">No open issues are assigned to you.</EmptyState>)}
    </QueryBoundary>
  );
}

function InboxTab() {
  const { notifications } = useAuth();
  const q = useNotifications(false);
  if (!notifications.supported) {
    return (
      <EmptyState title="Notifications are off">
        {notifications.reason}
      </EmptyState>
    );
  }
  return (
    <QueryBoundary query={q} compact skeleton={<ListSkeleton rows={5} compact />}>
      {(list) => (list.length ? <div className="divide-y divide-line">{list.slice(0, 12).map((t) => <NotificationRow key={t.id} thread={t} compact />)}</div> : <EmptyState title="Inbox zero">No unread notifications.</EmptyState>)}
    </QueryBoundary>
  );
}

function ReposTab() {
  const q = useRepos();
  const { settings, togglePinned } = useSettings();
  return (
    <QueryBoundary query={q} compact skeleton={<ListSkeleton rows={5} compact />}>
      {(all) => {
        const pinned = all.filter((r) => settings.pinned.includes(r.full_name));
        const list = pinned.length ? pinned : all.slice(0, 8);
        return <div className="divide-y divide-line">{list.map((r) => <RepoRow key={r.id} repo={r} compact pinned={settings.pinned.includes(r.full_name)} onTogglePin={togglePinned} />)}</div>;
      }}
    </QueryBoundary>
  );
}

export function PopupApp() {
  const { status, user } = useAuth();
  const { refreshAll } = useData();
  const { pending } = useFetchStatus();
  const [tab, setTab] = useState<Tab>('attention');

  const shell = 'flex h-[560px] w-[420px] flex-col overflow-hidden bg-bg';

  if (status === 'loading') return <div className={shell} />;

  if (status !== 'ready' || !user) {
    return (
      <div className={`${shell} items-center justify-center px-8 text-center`}>
        <Logo size={36} />
        <h1 className="mt-4 text-base font-semibold">{status === 'invalid' ? 'Reconnect GitHub' : 'Connect GitHub'}</h1>
        <p className="mt-1.5 text-sm text-muted">
          {status === 'invalid' ? 'GitHub no longer accepts your saved token.' : 'Add a personal access token to see your pull requests, issues and notifications.'} Setup happens in the full dashboard, because this popup closes when you switch tabs to create a token.
        </p>
        <Button className="mt-5" variant="primary" icon={<ExternalLink size={14} />} onClick={() => open('/settings')}>
          Set up in dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className={shell}>
      <header className="flex items-center gap-2.5 border-b border-line bg-surface px-3 py-2.5">
        <Avatar src={user.avatar_url} name={user.login} size={26} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{user.name ?? user.login}</div>
          <div className="font-mono text-xs text-muted">@{user.login}</div>
        </div>
        <IconButton label="Refresh" onClick={refreshAll}>
          <RefreshCw size={15} className={pending > 0 ? 'animate-[spin_1s_linear_infinite]' : ''} />
        </IconButton>
        <IconButton label="Open dashboard" onClick={() => open('/')}>
          <LayoutDashboard size={15} />
        </IconButton>
        <IconButton label="Settings" onClick={() => open('/settings')}>
          <Settings size={15} />
        </IconButton>
      </header>
      <div className="border-b border-line px-3 py-2">
        <Segmented<Tab>
          label="View"
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'attention', label: 'Attention' },
            { value: 'pulls', label: 'PRs' },
            { value: 'issues', label: 'Issues' },
            { value: 'inbox', label: 'Inbox' },
            { value: 'repos', label: 'Repos' },
          ]}
        />
      </div>
      <main className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'attention' && <AttentionTab />}
        {tab === 'pulls' && <PullsTab />}
        {tab === 'issues' && <IssuesTab />}
        {tab === 'inbox' && <InboxTab />}
        {tab === 'repos' && <ReposTab />}
      </main>
      <footer className="flex items-center justify-between border-t border-line bg-surface px-3 py-2 text-xs text-muted">
        <span>Your GitHub activity, one pulse away.</span>
        <button type="button" className="text-ink hover:underline" onClick={() => open('/')}>
          Open dashboard
        </button>
      </footer>
    </div>
  );
}
