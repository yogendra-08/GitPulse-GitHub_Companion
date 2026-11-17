import { useMemo, useState } from 'react';
import { BookMarked } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { QueryBoundary } from '@/components/QueryBoundary';
import { RepoRow } from '@/components/rows/RepoRow';
import { SearchInput, Select } from '@/components/ui/Controls';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import { useRepos } from '@/features/data/queries';
import { useSettings } from '@/features/SettingsProvider';
import { DEFAULT_REPO_FILTERS, filterRepos, languagesOf, type RepoFilters, type RepoSort, type RepoVisibility } from '@/lib/repos';

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex h-8 cursor-pointer items-center gap-2 text-sm text-muted hover:text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[rgb(var(--accent))]" />
      {label}
    </label>
  );
}

export default function ReposPage() {
  const repos = useRepos();
  const { settings, togglePinned } = useSettings();
  const [f, setF] = useState<RepoFilters>(DEFAULT_REPO_FILTERS);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const set = <K extends keyof RepoFilters>(k: K, v: RepoFilters[K]) => setF((p) => ({ ...p, [k]: v }));

  const shown = useMemo(() => {
    const list = filterRepos(repos.data ?? [], f);
    return pinnedOnly ? list.filter((r) => settings.pinned.includes(r.full_name)) : list;
  }, [repos.data, f, pinnedOnly, settings.pinned]);

  return (
    <>
      <PageHeader title="Repositories" description="Repositories you own, collaborate on, or reach through an organization." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={f.query} onChange={(v) => set('query', v)} placeholder="Search repositories" className="w-64" />
        <Select<RepoVisibility> label="Visibility" value={f.visibility} onChange={(v) => set('visibility', v)} options={[{ value: 'all', label: 'All visibility' }, { value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }]} />
        <Select label="Language" value={f.language} onChange={(v) => set('language', v)} options={[{ value: 'all', label: 'All languages' }, ...languagesOf(repos.data ?? []).map((l) => ({ value: l, label: l }))]} />
        <Select<RepoSort> label="Sort" value={f.sort} onChange={(v) => set('sort', v)} options={[{ value: 'updated', label: 'Recently pushed' }, { value: 'stars', label: 'Most stars' }, { value: 'name', label: 'Name' }]} />
        <div className="flex-1" />
        <Check label="Hide forks" checked={f.hideForks} onChange={(v) => set('hideForks', v)} />
        <Check label="Hide archived" checked={f.hideArchived} onChange={(v) => set('hideArchived', v)} />
        <Check label="Pinned only" checked={pinnedOnly} onChange={setPinnedOnly} />
      </div>
      <Panel flush>
        <QueryBoundary query={repos}>
          {(all) =>
            shown.length === 0 ? (
              <EmptyState icon={<BookMarked size={20} />} title={all.length ? 'No repositories match' : 'No repositories found'}>
                {all.length ? 'Try clearing a filter.' : 'GitHub returned no repositories for this token. A fine-grained token only sees the repositories you selected.'}
              </EmptyState>
            ) : (
              <>
                <div className="divide-y divide-line">
                  {shown.map((r) => (
                    <RepoRow key={r.id} repo={r} pinned={settings.pinned.includes(r.full_name)} onTogglePin={togglePinned} />
                  ))}
                </div>
                <div className="num border-t border-line px-4 py-2 text-xs text-muted">
                  {shown.length} of {all.length} repositories
                </div>
              </>
            )
          }
        </QueryBoundary>
      </Panel>
    </>
  );
}
