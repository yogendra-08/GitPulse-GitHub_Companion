import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { QueryBoundary } from '@/components/QueryBoundary';
import { Panel } from '@/components/ui/Panel';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useAuthoredHistory, useActivity, useContributions, useRepos } from '@/features/data/queries';
import { useChartColors, type ChartColors } from '@/hooks/useChartColors';
import { contributionStats, eventMix, issueActivityByMonth, pullActivityByMonth, weeklyTotals } from '@/lib/aggregate';
import { compactNumber, plural } from '@/lib/format';
import { formatDay } from '@/lib/time';
import { languageDistribution } from '@/lib/repos';

const axis = (c: ChartColors) => ({ stroke: c.faint, fontSize: 11, tickLine: false as const, axisLine: false as const });
const tooltipStyle = (c: ChartColors) => ({
  contentStyle: { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 6, fontSize: 12, color: c.ink },
  cursor: { fill: c.line, opacity: 0.4 },
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="num text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function Note({ children }: { children: string }) {
  return <p className="mt-3 text-xs text-muted">{children}</p>;
}

function ContributionsCard({ c }: { c: ChartColors }) {
  const q = useContributions();
  return (
    <Panel title="Contributions" description="Commits, pull requests, issues and reviews over the last 12 months (GitHub contribution calendar)">
      {q.data === undefined && q.error ? (
        <ErrorState error={q.error} onRetry={q.refetch} compact />
      ) : q.data === undefined ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        (() => {
          const stats = contributionStats(q.data.days);
          const weeks = weeklyTotals(q.data.days, 52).map((w) => ({ ...w, label: formatDay(w.weekStart) }));
          return (
            <>
              <div className="mb-4 flex flex-wrap gap-x-10 gap-y-3">
                <Stat label="contributions" value={compactNumber(q.data.total)} />
                <Stat label="active days" value={String(stats.activeDays)} />
                <Stat label="longest streak" value={plural(stats.longestStreak, 'day')} />
                <Stat label="current streak" value={plural(stats.currentStreak, 'day')} />
                {stats.busiest && <Stat label={`busiest day (${formatDay(stats.busiest.date)})`} value={String(stats.busiest.count)} />}
              </div>
              <div role="img" aria-label="Weekly contributions for the last year" className="h-44">
                <ResponsiveContainer>
                  <BarChart data={weeks} margin={{ left: -18, right: 4, top: 4 }}>
                    <CartesianGrid vertical={false} stroke={c.line} />
                    <XAxis dataKey="label" {...axis(c)} interval={Math.ceil(weeks.length / 8)} />
                    <YAxis {...axis(c)} allowDecimals={false} />
                    <Tooltip {...tooltipStyle(c)} formatter={(v: number) => [v, 'Contributions']} />
                    <Bar dataKey="count" fill={c.accent} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Note>Weeks start on the date shown. Totals come directly from GitHub, including private contributions only if your token and profile settings allow them.</Note>
            </>
          );
        })()
      )}
    </Panel>
  );
}

function EventMixCard({ c }: { c: ChartColors }) {
  const q = useActivity();
  return (
    <Panel title="Recent activity mix" description="What your latest events were (GitHub keeps about 30 days)">
      <QueryBoundary query={q} skeleton={<Skeleton className="h-44 w-full" />} compact>
        {(items) => {
          const mix = eventMix(items);
          if (!mix.length) return <EmptyState title="No recent events" />;
          return (
            <>
              <div role="img" aria-label="Recent events by type" style={{ height: Math.max(120, mix.length * 30) }}>
                <ResponsiveContainer>
                  <BarChart data={mix} layout="vertical" margin={{ left: 20, right: 12 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="label" width={130} {...axis(c)} />
                    <Tooltip {...tooltipStyle(c)} formatter={(v: number) => [v, 'Events']} />
                    <Bar dataKey="count" fill={c.info} radius={[0, 2, 2, 0]} barSize={14} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Note>{`Based on ${items.length} events. Push events count pushes, not individual commits.`}</Note>
            </>
          );
        }}
      </QueryBoundary>
    </Panel>
  );
}

function LanguagesCard({ c }: { c: ChartColors }) {
  const q = useRepos();
  const palette = [c.accent, c.info, c.merged, c.open, c.closed, c.muted];
  return (
    <Panel title="Languages" description="Primary language of each repository, counted by repository">
      <QueryBoundary query={q} skeleton={<Skeleton className="h-32 w-full" />} compact>
        {(repos) => {
          const { shares, unknown } = languageDistribution(repos);
          if (!shares.length) return <EmptyState title="No language data">None of your repositories report a primary language.</EmptyState>;
          const top = shares.slice(0, 5);
          const restRepos = shares.slice(5).reduce((s, x) => s + x.repos, 0);
          const rows = [...top, ...(restRepos ? [{ language: 'Other', repos: restRepos, share: restRepos / shares.reduce((s, x) => s + x.repos, 0) }] : [])];
          return (
            <>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-raised" role="img" aria-label="Language share by repository">
                {rows.map((r, i) => (
                  <div key={r.language} style={{ width: `${r.share * 100}%`, background: palette[i % palette.length] }} title={`${r.language}: ${r.repos}`} />
                ))}
              </div>
              <ul className="mt-4 space-y-2">
                {rows.map((r, i) => (
                  <li key={r.language} className="flex items-center gap-2.5 text-sm">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: palette[i % palette.length] }} />
                    <span className="flex-1">{r.language}</span>
                    <span className="num text-muted">{plural(r.repos, 'repo')}</span>
                    <span className="num w-12 text-right text-muted">{Math.round(r.share * 100)}%</span>
                  </li>
                ))}
              </ul>
              {unknown > 0 && <Note>{`${plural(unknown, 'repository', 'repositories')} without a detected language ${unknown === 1 ? 'is' : 'are'} not included in these percentages.`}</Note>}
            </>
          );
        }}
      </QueryBoundary>
    </Panel>
  );
}

function RepoStatsCard({ c }: { c: ChartColors }) {
  const q = useRepos();
  return (
    <Panel title="Repository stats" description="Totals across your repositories">
      <QueryBoundary query={q} skeleton={<Skeleton className="h-44 w-full" />} compact>
        {(repos) => {
          const stars = repos.reduce((s, r) => s + r.stargazers_count, 0);
          const forks = repos.reduce((s, r) => s + r.forks_count, 0);
          const top = [...repos].filter((r) => r.stargazers_count > 0).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6).map((r) => ({ name: r.name, stars: r.stargazers_count }));
          return (
            <>
              <div className="mb-4 flex gap-10">
                <Stat label="repositories" value={String(repos.length)} />
                <Stat label="stars" value={compactNumber(stars)} />
                <Stat label="forks" value={compactNumber(forks)} />
              </div>
              {top.length ? (
                <div role="img" aria-label="Most starred repositories" style={{ height: top.length * 30 + 10 }}>
                  <ResponsiveContainer>
                    <BarChart data={top} layout="vertical" margin={{ left: 20, right: 12 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={130} {...axis(c)} />
                      <Tooltip {...tooltipStyle(c)} formatter={(v: number) => [v, 'Stars']} />
                      <Bar dataKey="stars" fill={c.accent} radius={[0, 2, 2, 0]} barSize={14} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Note>None of your repositories have stars yet.</Note>
              )}
            </>
          );
        }}
      </QueryBoundary>
    </Panel>
  );
}

function PullActivityCard({ c }: { c: ChartColors }) {
  const q = useAuthoredHistory('pr');
  const result = useMemo(() => (q.data ? pullActivityByMonth(q.data.items, q.data.total_count) : null), [q.data]);
  return (
    <Panel title="Pull request activity" description="Pull requests you created, by month and current outcome">
      <QueryBoundary query={q} skeleton={<Skeleton className="h-44 w-full" />} compact>
        {() =>
          !result || result.buckets.every((b) => b.merged + b.closed + b.open === 0) ? (
            <EmptyState title="No pull requests in this period" />
          ) : (
            <>
              <div role="img" aria-label="Pull requests created per month" className="h-48">
                <ResponsiveContainer>
                  <BarChart data={result.buckets} margin={{ left: -18, right: 4, top: 4 }}>
                    <CartesianGrid vertical={false} stroke={c.line} />
                    <XAxis dataKey="label" {...axis(c)} />
                    <YAxis {...axis(c)} allowDecimals={false} />
                    <Tooltip {...tooltipStyle(c)} />
                    <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: c.muted }} />
                    <Bar dataKey="merged" name="Merged" stackId="a" fill={c.merged} isAnimationActive={false} />
                    <Bar dataKey="open" name="Open" stackId="a" fill={c.open} isAnimationActive={false} />
                    <Bar dataKey="closed" name="Closed unmerged" stackId="a" fill={c.closed} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {result.note && <Note>{result.note}</Note>}
            </>
          )
        }
      </QueryBoundary>
    </Panel>
  );
}

function IssueActivityCard({ c }: { c: ChartColors }) {
  const q = useAuthoredHistory('issue');
  const result = useMemo(() => (q.data ? issueActivityByMonth(q.data.items, q.data.total_count) : null), [q.data]);
  return (
    <Panel title="Issue activity" description="Issues you opened, by month, and how many are closed now">
      <QueryBoundary query={q} skeleton={<Skeleton className="h-44 w-full" />} compact>
        {() =>
          !result || result.buckets.every((b) => b.opened === 0) ? (
            <EmptyState title="No issues in this period" />
          ) : (
            <>
              <div role="img" aria-label="Issues opened per month" className="h-48">
                <ResponsiveContainer>
                  <BarChart data={result.buckets} margin={{ left: -18, right: 4, top: 4 }}>
                    <CartesianGrid vertical={false} stroke={c.line} />
                    <XAxis dataKey="label" {...axis(c)} />
                    <YAxis {...axis(c)} allowDecimals={false} />
                    <Tooltip {...tooltipStyle(c)} />
                    <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: c.muted }} />
                    <Bar dataKey="opened" name="Opened" fill={c.info} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="closed" name="Closed now" fill={c.merged} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {result.note && <Note>{result.note}</Note>}
            </>
          )
        }
      </QueryBoundary>
    </Panel>
  );
}

export default function AnalyticsPage() {
  const c = useChartColors();
  return (
    <>
      <PageHeader title="Analytics" description="Everything here is computed from data GitHub returns. Where GitHub can’t provide something, the card says so." />
      <div className="space-y-5">
        <ContributionsCard c={c} />
        <div className="grid gap-5 lg:grid-cols-2">
          <PullActivityCard c={c} />
          <IssueActivityCard c={c} />
          <RepoStatsCard c={c} />
          <LanguagesCard c={c} />
        </div>
        <EventMixCard c={c} />
      </div>
    </>
  );
}
