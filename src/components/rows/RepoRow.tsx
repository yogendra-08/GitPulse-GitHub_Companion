import { Archive, CircleDot, GitFork, Lock, Pin, PinOff, Star } from 'lucide-react';
import { compactNumber } from '@/lib/format';
import { timeAgo } from '@/lib/time';
import type { Repo } from '@/shared/types';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/Button';
import { Meta } from './shared';

interface Props {
  repo: Repo;
  pinned: boolean;
  onTogglePin: (fullName: string) => void;
  compact?: boolean;
}

export function RepoRow({ repo, pinned, onTogglePin, compact }: Props) {
  return (
    <div className={`group relative flex items-start gap-3 transition-colors hover:bg-raised ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <a href={repo.html_url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-ink after:absolute after:inset-0 group-hover:underline">
            {repo.full_name}
          </a>
          {repo.private && (
            <Badge>
              <Lock size={10} aria-hidden /> Private
            </Badge>
          )}
          {repo.fork && <Badge>Fork</Badge>}
          {repo.archived && (
            <Badge>
              <Archive size={10} aria-hidden /> Archived
            </Badge>
          )}
        </div>
        {repo.description && !compact && <p className="mt-0.5 line-clamp-1 text-sm text-muted">{repo.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          {repo.language && <Meta>{repo.language}</Meta>}
          <Meta icon={<Star size={12} aria-hidden />} title="Stars">
            <span className="num">{compactNumber(repo.stargazers_count)}</span>
          </Meta>
          <Meta icon={<GitFork size={12} aria-hidden />} title="Forks">
            <span className="num">{compactNumber(repo.forks_count)}</span>
          </Meta>
          <Meta icon={<CircleDot size={12} aria-hidden />} title="Open issues and pull requests">
            <span className="num">{repo.open_issues_count}</span>
          </Meta>
          {!compact && (
            <Meta title="Default branch">
              <span className="font-mono">{repo.default_branch}</span>
            </Meta>
          )}
          <Meta title={repo.pushed_at ? new Date(repo.pushed_at).toLocaleString() : undefined}>pushed {timeAgo(repo.pushed_at ?? repo.updated_at)}</Meta>
        </div>
      </div>
      <div className="relative z-10 shrink-0">
        <IconButton
          label={pinned ? `Unpin ${repo.name}` : `Pin ${repo.name}`}
          aria-pressed={pinned}
          onClick={() => onTogglePin(repo.full_name)}
          className={pinned ? 'text-accent' : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100'}
        >
          {pinned ? <PinOff size={15} /> : <Pin size={15} />}
        </IconButton>
      </div>
    </div>
  );
}
