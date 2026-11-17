import { useMemo, useState } from 'react';
import { CircleDot } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { QueryBoundary } from '@/components/QueryBoundary';
import { IssueRow } from '@/components/rows/PullRows';
import { SearchInput, Segmented, Select } from '@/components/ui/Controls';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import { useAuth } from '@/features/auth/AuthProvider';
import { useIssues } from '@/features/data/queries';
import { issueQuery, type IssueRole, type IssueState } from '@/lib/queries';

type Sort = 'updated' | 'newest' | 'oldest' | 'stale';

export default function IssuesPage() {
  const { user } = useAuth();
  const [role, setRole] = useState<IssueRole>('assigned');
  const [state, setState] = useState<IssueState>('open');
  const [q, setQ] = useState('');
  const [label, setLabel] = useState('all');
  const [sort, setSort] = useState<Sort>('updated');
  const query = useIssues(role, state);

  const labels = useMemo(() => [...new Set((query.data?.items ?? []).flatMap((i) => i.labels.map((l) => l.name)))].sort(), [query.data]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = (query.data?.items ?? []).filter(
      (i) =>
        (label === 'all' || i.labels.some((l) => l.name === label)) &&
        (!needle || `${i.title} ${i.repository_url} ${i.user?.login ?? ''}`.toLowerCase().includes(needle)),
    );
    const t = (i: (typeof out)[number], k: 'updated_at' | 'created_at') => Date.parse(i[k]);
    return out.sort((a, b) =>
      sort === 'newest' ? t(b, 'created_at') - t(a, 'created_at') : sort === 'oldest' ? t(a, 'created_at') - t(b, 'created_at') : sort === 'stale' ? t(a, 'updated_at') - t(b, 'updated_at') : t(b, 'updated_at') - t(a, 'updated_at'),
    );
  }, [query.data, q, label, sort]);

  return (
    <>
      <PageHeader title="Issues" description="Issues assigned to you, created by you, or mentioning you." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented label="Relationship" value={role} onChange={setRole} options={[{ value: 'assigned', label: 'Assigned' }, { value: 'authored', label: 'Created by me' }, { value: 'mentioned', label: 'Mentioning me' }]} />
        <Segmented label="State" value={state} onChange={setState} options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} />
        <div className="flex-1" />
        <SearchInput value={q} onChange={setQ} placeholder="Filter by title, repo or author" className="w-60" />
        <Select label="Label" value={label} onChange={setLabel} options={[{ value: 'all', label: 'All labels' }, ...labels.map((l) => ({ value: l, label: l }))]} />
        <Select<Sort> label="Sort" value={sort} onChange={setSort} options={[{ value: 'updated', label: 'Recently updated' }, { value: 'stale', label: 'Least recently updated' }, { value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }]} />
      </div>
      <Panel flush>
        <QueryBoundary query={query}>
          {(data) =>
            shown.length === 0 ? (
              <EmptyState icon={<CircleDot size={20} />} title={data.items.length ? 'No issues match your filters' : 'No issues here'}>
                {data.items.length ? 'Clear the filter or pick another label.' : state === 'open' && role === 'assigned' ? 'No open issues are assigned to you.' : 'Nothing matches this view yet.'}
              </EmptyState>
            ) : (
              <>
                <div className="divide-y divide-line">
                  {shown.map((i) => (
                    <IssueRow key={i.id} item={i} />
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-muted">
                  <span className="num">
                    Showing {shown.length} of {data.total_count}
                    {data.total_count > data.items.length && ` (GitHub returned the ${data.items.length} most recent)`}
                  </span>
                  {user && (
                    <a className="text-ink hover:underline" target="_blank" rel="noreferrer" href={`https://github.com/issues?q=${encodeURIComponent(issueQuery(user.login, role, state))}`}>
                      View on GitHub
                    </a>
                  )}
                </div>
              </>
            )
          }
        </QueryBoundary>
      </Panel>
    </>
  );
}
