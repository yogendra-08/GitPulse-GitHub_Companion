import { Link } from 'react-router-dom';
import { ExternalLink, GitPullRequest, CircleDot, MessageSquareQuote, PenLine, Bell } from 'lucide-react';
import { ActivityRow } from '@/components/rows/ActivityRow';
import { RepoRow } from '@/components/rows/RepoRow';
import { Meta, RepoName, RowLink } from '@/components/rows/shared';
import { PulseStrip } from '@/components/PulseStrip';
import { QueryBoundary } from '@/components/QueryBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useAuth } from '@/features/auth/AuthProvider';
import { useActivity, useContributions, useRepos } from '@/features/data/queries';
import { useAttention } from '@/features/data/useAttention';
import { useSettings } from '@/features/SettingsProvider';
import { ATTENTION_LABELS, type AttentionItem, type AttentionReason } from '@/lib/attention';
import { eventsByDay, contributionStats } from '@/lib/aggregate';
import { compactNumber, plural } from '@/lib/format';
import { timeAgo } from '@/lib/time';

const REASON_TONE: Record<AttentionReason, Tone> = {
  changes_requested: 'closed',
  review_requested: 'accent',
  mentioned: 'info',
  assigned: 'neutral',
};

function AttentionRow({ item }: { item: AttentionItem }) {
  const Icon = item.kind === 'pr' ? GitPullRequest : item.kind === 'issue' ? CircleDot : Bell;
  return (
    <RowLink href={item.url} compact>
      <Icon aria-hidden size={16} className="mt-0.5 shrink-0 text-faint" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink group-hover:underline">{item.title}</div>
        <div className="mt-1 flex items-center gap-3">
          <RepoName name={item.repo} />
          <Meta>{timeAgo(item.at)}</Meta>
        </div>
      </div>
      <Badge tone={REASON_TONE[item.reason]}>{ATTENTION_LABELS[item.reason]}</Badge>
    </RowLink>
  );
}

function ProfileHeader() {
  const { user } = useAuth();
  if (!user) return null;
  const stats = [
    { label: 'repositories', value: user.public_repos, href: `${user.html_url}?tab=repositories` },
    { label: 'followers', value: user.followers, href: `${user.html_url}?tab=followers` },
    { label: 'following', value: user.following, href: `${user.html_url}?tab=following` },
  ];
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <Avatar src={user.avatar_url} name={user.login} size={52} />
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold tracking-tight">{user.name ?? user.login}</h1>
        <p className="mt-0.5 truncate text-sm text-muted">
          <a href={user.html_url} target="_blank" rel="noreferrer" className="font-mono text-xs hover:text-ink">
            @{user.login}
          </a>
          {user.bio && <span className="ml-3">{user.bio}</span>}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
          {stats.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-ink">
              <span className="num font-medium text-ink">{compactNumber(s.value)}</span> {s.label}
            </a>
          ))}
        </div>
      </div>
      <a
        href={user.html_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 items-center gap-2 rounded-md border border-line-strong px-3 text-sm text-ink transition-colors hover:bg-raised"
      >
        Open on GitHub <ExternalLink size={13} aria-hidden />
      </a>
    </div>
  );
}

function AttentionPanel() {
  const a = useAttention();
  const { notifications } = useAuth();
  return (
    <Panel
      title="Needs your attention"
      description="Review requests, requested changes, mentions and assigned issues"
      action={a.items.length > 0 ? <span className="num text-xs text-muted">{plural(a.items.length, 'item')}</span> : undefined}
      flush
    >
      {a.loading ? (
        <ListSkeleton rows={4} compact />
      ) : a.error ? (
        <ErrorState error={a.error} onRetry={a.refetch} compact />
      ) : a.items.length === 0 ? (
        <EmptyState icon={<MessageSquareQuote size={20} />} title="Nothing is waiting on you">
          No open review requests, requested changes or assigned issues.
          {!notifications.supported && ' Mentions aren’t included because your token can’t read notifications.'}
        </EmptyState>
      ) : (
        <div className="divide-y divide-line">
          {a.items.slice(0, 8).map((item) => (
            <AttentionRow key={item.id} item={item} />
          ))}
        </div>
      )}
      {a.items.length > 8 && (
        <div className="border-t border-line px-4 py-2 text-xs text-muted">
          Showing 8 of {a.items.length}. See all in <Link to="/pulls" className="text-ink hover:underline">Pull requests</Link> and <Link to="/issues" className="text-ink hover:underline">Issues</Link>.
        </div>
      )}
    </Panel>
  );
}

function PulsePanel() {
  const contrib = useContributions();
  const events = useActivity();

  let body;
  if (contrib.data && contrib.data.days.length) {
    const last90 = contrib.data.days.filter((d) => d.date <= new Date().toISOString().slice(0, 10)).slice(-90);
    const stats = contributionStats(contrib.data.days);
    const total90 = last90.reduce((s, d) => s + d.count, 0);
    body = (
      <>
        <PulseStrip days={last90} noun="contributions" />
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span>
            <span className="num font-medium">{total90}</span> <span className="text-muted">contributions in 90 days</span>
          </span>
          <span className="text-muted">
            {stats.currentStreak > 0 ? `${plural(stats.currentStreak, 'day')} streak` : 'No current streak'}
          </span>
        </div>
      </>
    );
  } else if (contrib.loading || (events.loading && !contrib.error)) {
    body = <Skeleton className="h-20 w-full" />;
  } else if (events.data) {
    const days = eventsByDay(events.data, 30);
    body = (
      <>
        <PulseStrip days={days} noun="events" />
        <p className="mt-3 text-xs text-muted">
          Showing events from GitHub&rsquo;s activity feed (about the last 30 days). The contribution calendar couldn&rsquo;t be loaded
          {contrib.error ? `: ${contrib.error.message}` : '.'}
        </p>
      </>
    );
  } else {
    body = <ErrorState error={contrib.error ?? events.error ?? new Error('No activity data available.')} onRetry={() => { contrib.refetch(); events.refetch(); }} compact />;
  }
  return <Panel title="Pulse" description="Daily activity">{body}</Panel>;
}

function ReposPanel() {
  const repos = useRepos();
  const { settings, togglePinned } = useSettings();
  return (
    <Panel title={settings.pinned.length ? 'Pinned repositories' : 'Recently pushed'} flush>
      <QueryBoundary query={repos} compact skeleton={<ListSkeleton rows={4} compact />}>
        {(all) => {
          const pinned = settings.pinned.map((n) => all.find((r) => r.full_name === n)).filter((r): r is NonNullable<typeof r> => !!r);
          const list = pinned.length
            ? pinned
            : [...all].sort((a, b) => Date.parse(b.pushed_at ?? b.updated_at) - Date.parse(a.pushed_at ?? a.updated_at)).slice(0, 5);
          if (!list.length) return <EmptyState icon={<PenLine size={20} />} title="No repositories yet">Repositories you can access will appear here.</EmptyState>;
          return (
            <div className="divide-y divide-line">
              {list.map((r) => (
                <RepoRow key={r.id} repo={r} compact pinned={settings.pinned.includes(r.full_name)} onTogglePin={togglePinned} />
              ))}
            </div>
          );
        }}
      </QueryBoundary>
    </Panel>
  );
}

function ActivityPanel() {
  const events = useActivity();
  return (
    <Panel title="Recent activity" flush>
      <QueryBoundary query={events} skeleton={<ListSkeleton rows={5} compact />}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState title="No recent activity">GitHub&rsquo;s feed shows events from roughly the last 30 days.</EmptyState>
          ) : (
            <div className="divide-y divide-line">
              {items.slice(0, 10).map((it) => (
                <ActivityRow key={it.id} item={it} />
              ))}
            </div>
          )
        }
      </QueryBoundary>
    </Panel>
  );
}

export default function OverviewPage() {
  const { settings } = useSettings();
  const s = settings.overviewSections;
  return (
    <>
      <ProfileHeader />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {s.attention && <AttentionPanel />}
          {s.activity && <ActivityPanel />}
        </div>
        <div className="space-y-5">
          {s.pulse && <PulsePanel />}
          {s.repos && <ReposPanel />}
        </div>
      </div>
    </>
  );
}
