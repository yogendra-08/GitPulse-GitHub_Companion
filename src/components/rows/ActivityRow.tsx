import { Activity, CircleDot, Eye, GitBranch, GitFork, GitPullRequest, MessageSquare, Plus, Rocket, Star, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ActivityItem, ActivityKind } from '@/lib/activity';
import { timeAgo } from '@/lib/time';
import { RepoName } from './shared';

const ICONS: Record<ActivityKind, ReactNode> = {
  push: <GitBranch size={14} />,
  pr: <GitPullRequest size={14} />,
  review: <Eye size={14} />,
  issue: <CircleDot size={14} />,
  comment: <MessageSquare size={14} />,
  create: <Plus size={14} />,
  delete: <Trash2 size={14} />,
  star: <Star size={14} />,
  fork: <GitFork size={14} />,
  release: <Rocket size={14} />,
  other: <Activity size={14} />,
};

export function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-raised">
      <span className="mt-0.5 text-faint">{ICONS[item.kind]}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-ink group-hover:underline">{item.summary}</div>
        <RepoName name={item.repo} />
      </div>
      <time dateTime={item.at} title={new Date(item.at).toLocaleString()} className="shrink-0 pt-0.5 text-xs text-muted">
        {timeAgo(item.at)}
      </time>
    </a>
  );
}
