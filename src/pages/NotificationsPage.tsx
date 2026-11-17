import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellOff, CheckCheck, Inbox, Lock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { QueryBoundary } from '@/components/QueryBoundary';
import { NotificationRow } from '@/components/rows/NotificationRow';
import { Button } from '@/components/ui/Button';
import { Segmented, Select } from '@/components/ui/Controls';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import { useAuth } from '@/features/auth/AuthProvider';
import { mutateNotificationCache, useNotifications } from '@/features/data/queries';
import { markAllNotificationsRead, markThreadDone, markThreadRead } from '@/shared/github/api';
import { sendToBackground, MESSAGE } from '@/shared/messages';
import { isMention, isReviewRequest } from '@/shared/notifications';

type Filter = 'unread' | 'mentions' | 'reviews' | 'all';

export default function NotificationsPage() {
  const { notifications: cap, client, user } = useAuth();
  const [filter, setFilter] = useState<Filter>('unread');
  const [repo, setRepo] = useState('all');
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useNotifications(filter === 'all');

  const act = useCallback(
    async (id: string | null, kind: 'read' | 'done' | 'all') => {
      if (!client || !user) return;
      setActionError(null);
      if (id) setBusy((b) => new Set(b).add(id));
      try {
        if (kind === 'all') await markAllNotificationsRead(client);
        else if (kind === 'read') await markThreadRead(client, id!);
        else await markThreadDone(client, id!);
        await mutateNotificationCache(user.login, (list) =>
          kind === 'done' ? list.filter((t) => t.id !== id) : kind === 'all' ? list.map((t) => ({ ...t, unread: false })) : list.map((t) => (t.id === id ? { ...t, unread: false } : t)),
        );
        void sendToBackground({ type: MESSAGE.pollNow });
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'That action failed.');
        query.refetch();
      } finally {
        if (id) setBusy((b) => { const n = new Set(b); n.delete(id); return n; });
      }
    },
    [client, user, query],
  );

  const repos = useMemo(() => [...new Set((query.data ?? []).map((t) => t.repository.full_name))].sort(), [query.data]);
  const shown = useMemo(
    () =>
      (query.data ?? []).filter((t) => {
        if (filter === 'unread' && !t.unread) return false;
        if (filter === 'mentions' && !(t.unread && isMention(t))) return false;
        if (filter === 'reviews' && !(t.unread && isReviewRequest(t))) return false;
        return repo === 'all' || t.repository.full_name === repo;
      }),
    [query.data, filter, repo],
  );
  const unreadCount = (query.data ?? []).filter((t) => t.unread).length;

  if (!cap.supported) {
    return (
      <>
        <PageHeader title="Notifications" />
        <Panel>
          <EmptyState icon={<Lock size={20} />} title="Notifications need a classic token" action={<Link to="/settings"><Button variant="primary">Open settings</Button></Link>}>
            {cap.reason}
          </EmptyState>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Your GitHub inbox. Marking a thread read here marks it read on GitHub."
        actions={
          <Button icon={<CheckCheck size={14} />} disabled={unreadCount === 0} onClick={() => void act(null, 'all')}>
            Mark all as read
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          label="Filter"
          value={filter}
          onChange={setFilter}
          options={[{ value: 'unread', label: 'Unread' }, { value: 'mentions', label: 'Mentions' }, { value: 'reviews', label: 'Review requests' }, { value: 'all', label: 'All' }]}
        />
        <div className="flex-1" />
        <Select label="Repository" value={repo} onChange={setRepo} options={[{ value: 'all', label: 'All repositories' }, ...repos.map((r) => ({ value: r, label: r }))]} />
      </div>
      {actionError && <p role="alert" className="mb-3 text-sm text-closed">{actionError}</p>}
      <Panel flush>
        <QueryBoundary query={query}>
          {() =>
            shown.length === 0 ? (
              <EmptyState icon={filter === 'unread' ? <Inbox size={20} /> : <BellOff size={20} />} title={filter === 'unread' ? 'Inbox zero' : 'Nothing to show'}>
                {filter === 'unread' ? 'You have no unread notifications.' : 'No notifications match this filter.'}
              </EmptyState>
            ) : (
              <div className="divide-y divide-line">
                {shown.map((t) => (
                  <NotificationRow key={t.id} thread={t} busy={busy.has(t.id)} onMarkRead={(id) => void act(id, 'read')} onMarkDone={(id) => void act(id, 'done')} />
                ))}
              </div>
            )
          }
        </QueryBoundary>
      </Panel>
    </>
  );
}
