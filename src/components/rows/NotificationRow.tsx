import { Bell, Check, CheckCheck, CircleDot, GitCommit, GitPullRequest, MessagesSquare, PlayCircle, ShieldAlert, Tag } from 'lucide-react';
import type { ReactNode } from 'react';
import { timeAgo } from '@/lib/time';
import { isDirect, reasonLabel, threadHtmlUrl } from '@/shared/notifications';
import type { NotificationThread } from '@/shared/types';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/Button';
import { Meta, RepoName } from './shared';

const SUBJECT_ICONS: Record<string, ReactNode> = {
  PullRequest: <GitPullRequest size={16} />,
  Issue: <CircleDot size={16} />,
  Commit: <GitCommit size={16} />,
  Release: <Tag size={16} />,
  Discussion: <MessagesSquare size={16} />,
  CheckSuite: <PlayCircle size={16} />,
  RepositoryVulnerabilityAlert: <ShieldAlert size={16} />,
};

interface Props {
  thread: NotificationThread;
  busy?: boolean;
  compact?: boolean;
  onMarkRead?: (id: string) => void;
  onMarkDone?: (id: string) => void;
}

export function NotificationRow({ thread, busy, compact, onMarkRead, onMarkDone }: Props) {
  const url = threadHtmlUrl(thread);
  return (
    <div className={`group relative flex items-start gap-3 transition-colors hover:bg-raised ${compact ? 'px-3 py-2.5' : 'px-4 py-3'} ${busy ? 'opacity-60' : ''}`}>
      <span className={`mt-0.5 ${thread.unread ? 'text-accent' : 'text-faint'}`}>{SUBJECT_ICONS[thread.subject.type] ?? <Bell size={16} />}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {/* Stretched link: the whole row opens the thread; action buttons sit above it. */}
          <a href={url} target="_blank" rel="noreferrer" className={`truncate text-sm after:absolute after:inset-0 ${thread.unread ? 'font-medium text-ink' : 'text-muted'}`}>
            {thread.subject.title}
          </a>
          {isDirect(thread) && <Badge tone="accent">{reasonLabel(thread.reason)}</Badge>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <RepoName name={thread.repository.full_name} />
          {!isDirect(thread) && <Meta>{reasonLabel(thread.reason)}</Meta>}
          <Meta title={new Date(thread.updated_at).toLocaleString()}>{timeAgo(thread.updated_at)}</Meta>
        </div>
      </div>
      {(onMarkRead || onMarkDone) && (
        <div className="relative z-10 flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {thread.unread && onMarkRead && (
            <IconButton label="Mark as read" disabled={busy} onClick={() => onMarkRead(thread.id)}>
              <Check size={15} />
            </IconButton>
          )}
          {onMarkDone && (
            <IconButton label="Mark as done" disabled={busy} onClick={() => onMarkDone(thread.id)}>
              <CheckCheck size={15} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}
