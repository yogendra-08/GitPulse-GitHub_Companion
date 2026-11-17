import { useMemo, useState } from 'react';
import { GitPullRequest } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { QueryBoundary } from '@/components/QueryBoundary';
import { PullRequestRow } from '@/components/rows/PullRows';
import { SearchInput, Segmented, Select } from '@/components/ui/Controls';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import { usePullRequests, useReviewStatuses } from '@/features/data/queries';
import { useAuth } from '@/features/auth/AuthProvider';
import { pullRequestQuery, type PullRole, type PullState } from '@/lib/queries';
import type { SearchItem } from '@/shared/types';

type DraftFilter = 'all' | 'hide' | 'only';
type Sort = 'updated' | 'newest' | 'oldest';

function applyFilters(items: SearchItem[], q: string, draft: DraftFilter, sort: Sort): SearchItem[] {
  const needle = q.trim().toLowerCase();
  const out = items.filter((i) => {
    if (draft === 'hide' && i.draft) return false;
    if (draft === 'only' && !i.draft) return false;
    if (needle && !`${i.title} ${i.repository_url} ${i.user?.login ?? ''} ${i.labels.map((l) => l.name).join(' ')}`.toLowerCase().includes(needle)) return false;
    return true;
  });
  const key = (i: SearchItem) => Date.parse(sort === 'updated' ? i.updated_at : i.created_at);
  return out.sort((a, b) => (sort === 'oldest' ? key(a) - key(b) : key(b) - key(a)));
}

export default function PullRequestsPage() {
  const { user } = useAuth();
  const [role, setRole] = useState<PullRole>('authored');
  const [state, setState] = useState<PullState>('open');
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState<DraftFilter>('all');
  const [sort, setSort] = useState<Sort>('updated');

  const effectiveState: PullState = role === 'review-requested' ? 'open' : state;
  const query = usePullRequests(role, effectiveState);
  const reviews = useReviewStatuses(role === 'authored' && effectiveState === 'open' ? query.data?.items : undefined);
  const ghQuery = user ? pullRequestQuery(user.login, role, effectiveState) : '';

  const shown = useMemo(() => (query.data ? applyFilters(query.data.items, q, draft, sort) : []), [query.data, q, draft, sort]);

  return (
    <>
      <PageHeader title="Pull requests" description="Track what you opened, what needs your review, and what is assigned to you." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          label="Relationship"
          value={role}
          onChange={setRole}
          options={[
            { value: 'authored', label: 'Created by me' },
            { value: 'review-requested', label: 'Review requested' },
            { value: 'assigned', label: 'Assigned' },
          ]}
        />
        {role !== 'review-requested' && (
          <Segmented
            label="State"
            value={state}
            onChange={setState}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'merged', label: 'Merged' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
        )}
        <div className="flex-1" />
        <SearchInput value={q} onChange={setQ} placeholder="Filter by title, repo, author or label" className="w-64" />
        <Select<DraftFilter> label="Drafts" value={draft} onChange={setDraft} options={[{ value: 'all', label: 'Drafts: include' }, { value: 'hide', label: 'Drafts: hide' }, { value: 'only', label: 'Drafts: only' }]} />
        <Select<Sort> label="Sort" value={sort} onChange={setSort} options={[{ value: 'updated', label: 'Recently updated' }, { value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }]} />
      </div>
      <Panel flush>
        <QueryBoundary query={query}>
          {(data) =>
            shown.length === 0 ? (
              <EmptyState icon={<GitPullRequest size={20} />} title={data.items.length ? 'No pull requests match your filters' : 'No pull requests here'}>
                {data.items.length ? 'Clear the filter or change the draft setting.' : role === 'review-requested' ? 'Nobody is waiting on your review.' : 'Nothing matches this view yet.'}
              </EmptyState>
            ) : (
              <>
                <div className="divide-y divide-line">
                  {shown.map((i) => (
                    <PullRequestRow key={i.id} item={i} review={reviews.data?.[i.html_url]} />
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-muted">
                  <span className="num">
                    Showing {shown.length} of {data.total_count}
                    {data.total_count > data.items.length && ` (GitHub returned the ${data.items.length} most recent)`}
                  </span>
                  <a className="text-ink hover:underline" target="_blank" rel="noreferrer" href={`https://github.com/pulls?q=${encodeURIComponent(ghQuery)}`}>
                    View on GitHub
                  </a>
                </div>
              </>
            )
          }
        </QueryBoundary>
      </Panel>
      {role === 'authored' && effectiveState === 'open' && (
        <p className="mt-3 text-xs text-muted">Review status is read for up to 20 open pull requests at a time. Pull requests without a badge have no decisive review yet.</p>
      )}
    </>
  );
}
