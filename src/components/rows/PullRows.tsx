import { CircleCheck, CircleDot, GitMerge, GitPullRequest, GitPullRequestClosed, GitPullRequestDraft, MessageSquare } from 'lucide-react';
import { repoFromUrl } from '@/lib/queries';
import { REVIEW_LABELS, type ReviewStatus } from '@/lib/reviews';
import { timeAgo } from '@/lib/time';
import type { SearchItem } from '@/shared/types';
import { Badge, type Tone } from '../ui/Badge';
import { LabelChip, Meta, RepoName, RowLink } from './shared';

export function PullStateIcon({ item, size = 16 }: { item: SearchItem; size?: number }) {
  if (item.pull_request?.merged_at) return <GitMerge size={size} className="text-merged" aria-label="Merged" />;
  if (item.state === 'closed') return <GitPullRequestClosed size={size} className="text-closed" aria-label="Closed" />;
  if (item.draft) return <GitPullRequestDraft size={size} className="text-faint" aria-label="Draft" />;
  return <GitPullRequest size={size} className="text-open" aria-label="Open" />;
}

const REVIEW_TONE: Record<ReviewStatus, Tone> = {
  approved: 'open',
  changes_requested: 'closed',
  commented: 'info',
  none: 'neutral',
};

interface PullProps {
  item: SearchItem;
  /** Undefined means "not loaded or unavailable" and renders no badge. */
  review?: ReviewStatus;
  compact?: boolean;
}

export function PullRequestRow({ item, review, compact }: PullProps) {
  const repo = repoFromUrl(item.repository_url);
  const merged = !!item.pull_request?.merged_at;
  return (
    <RowLink href={item.html_url} compact={compact}>
      <span className="mt-0.5">
        <PullStateIcon item={item} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium text-ink group-hover:underline">{item.title}</span>
          {item.draft && <Badge>Draft</Badge>}
          {!compact && item.labels.slice(0, 3).map((l) => <LabelChip key={l.name} label={l} />)}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <RepoName name={`${repo}#${item.number}`} />
          {item.user && <Meta>by {item.user.login}</Meta>}
          <Meta title={new Date(item.created_at).toLocaleString()}>opened {timeAgo(item.created_at)}</Meta>
          {merged ? (
            <Meta>merged {timeAgo(item.pull_request?.merged_at)}</Meta>
          ) : item.state === 'closed' ? (
            <Meta>closed {timeAgo(item.closed_at)}</Meta>
          ) : (
            !compact && <Meta>updated {timeAgo(item.updated_at)}</Meta>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 pt-0.5">
        {review && review !== 'none' && <Badge tone={REVIEW_TONE[review]}>{REVIEW_LABELS[review]}</Badge>}
        {!compact && item.comments > 0 && (
          <Meta icon={<MessageSquare size={12} aria-hidden />}>
            <span className="num">{item.comments}</span>
          </Meta>
        )}
      </div>
    </RowLink>
  );
}

export function IssueRow({ item, compact }: { item: SearchItem; compact?: boolean }) {
  const repo = repoFromUrl(item.repository_url);
  const closed = item.state === 'closed';
  return (
    <RowLink href={item.html_url} compact={compact}>
      <span className="mt-0.5">
        {closed ? <CircleCheck size={16} className="text-merged" aria-label="Closed" /> : <CircleDot size={16} className="text-open" aria-label="Open" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium text-ink group-hover:underline">{item.title}</span>
          {!closed && Date.now() - Date.parse(item.updated_at) > 30 * 86_400_000 && (
            <Badge title="No updates in over 30 days">Stale</Badge>
          )}
          {item.labels.slice(0, compact ? 2 : 4).map((l) => (
            <LabelChip key={l.name} label={l} />
          ))}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <RepoName name={`${repo}#${item.number}`} />
          {item.user && <Meta>by {item.user.login}</Meta>}
          <Meta title={new Date(item.created_at).toLocaleString()}>opened {timeAgo(item.created_at)}</Meta>
          <Meta>{closed ? `closed ${timeAgo(item.closed_at)}` : `updated ${timeAgo(item.updated_at)}`}</Meta>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 pt-0.5">
        {item.assignees.length > 0 && (
          <Meta title={item.assignees.map((a) => a.login).join(', ')}>
            {item.assignees.length === 1 ? item.assignees[0]!.login : `${item.assignees.length} assignees`}
          </Meta>
        )}
        {!compact && item.comments > 0 && (
          <Meta icon={<MessageSquare size={12} aria-hidden />}>
            <span className="num">{item.comments}</span>
          </Meta>
        )}
      </div>
    </RowLink>
  );
}
