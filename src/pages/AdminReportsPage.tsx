import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, Loader2, MessageSquare, MessageSquareWarning } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import ReportThread, { type IssueReport } from '@/components/support/ReportThread';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

/**
 * The issue queue.
 *
 * Every report is a conversation with the learner: reply, and they see it in
 * their notifications; reply and resolve closes it in one step.
 */
export default function AdminReportsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get('report');

  const [reports, setReports] = useState<IssueReport[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<'open' | 'resolved' | ''>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  // Full conversations, loaded when a report is opened.
  const [threads, setThreads] = useState<Record<string, IssueReport>>({});
  const [expanded, setExpanded] = useState<string | null>(focusId);
  // A report opened from a notification may not be on the current page.
  const [focused, setFocused] = useState<IssueReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ reports: IssueReport[]; openCount: number; meta: { total: number } }>(
        '/admin/reports',
        { limit: PAGE_SIZE, offset, status },
      );
      setReports(data.reports ?? []);
      setOpenCount(data.openCount ?? 0);
      setTotal(data.meta?.total ?? 0);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [offset, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadThread = useCallback(async (id: string) => {
    try {
      const data = await api.get<{ report: IssueReport }>(`/admin/reports/${id}`);
      setThreads(prev => ({ ...prev, [id]: data.report }));
      return data.report;
    } catch (err) {
      toast.error('Could not open that report', errorMessage(err));
      return null;
    }
  }, [toast]);

  // Arriving from a notification: open that conversation, wherever it sits.
  useEffect(() => {
    if (!focusId) return;
    setExpanded(focusId);
    void loadThread(focusId).then(report => {
      setFocused(report);
      requestAnimationFrame(() => document.getElementById(`report-${focusId}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    });
  }, [focusId, loadThread]);

  const toggle = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!threads[id]) void loadThread(id);
  };

  const reply = async (report: IssueReport, message: string, resolve: boolean) => {
    try {
      const data = await api.post<{ report: IssueReport }>(`/admin/reports/${report.id}/replies`, { message, resolve });
      setThreads(prev => ({ ...prev, [report.id]: data.report }));
      if (focused?.id === report.id) setFocused(data.report);
      toast.success(resolve ? 'Replied and resolved' : 'Reply sent', `${report.userName} will see it in their notifications.`);
      void load();
    } catch (err) {
      toast.error('Could not send that reply', errorMessage(err));
      throw err;
    }
  };

  const resolve = async (report: IssueReport) => {
    setSavingId(report.id);
    try {
      await api.patch(`/admin/reports/${report.id}/resolve`, {});
      toast.success('Report resolved', `${report.userName} has been told.`);
      if (threads[report.id]) void loadThread(report.id);
      void load();
    } catch (err) {
      toast.error('Could not resolve that report', errorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const pick = (next: 'open' | 'resolved' | '') => {
    setOffset(0);
    setStatus(next);
  };

  const clearFocus = () => {
    setFocused(null);
    searchParams.delete('report');
    setSearchParams(searchParams, { replace: true });
  };

  // The focused report is shown on its own above the list unless the list
  // already contains it.
  const pinned = focused && !reports.some(r => r.id === focused.id) ? focused : null;

  const renderCard = (listed: IssueReport) => {
    const report = threads[listed.id] ?? listed;
    const isOpen = expanded === listed.id;
    const waiting = listed.status === 'open' && listed.lastFromLearner !== false;
    return (
      <Card key={listed.id} id={`report-${listed.id}`} className={cn('scroll-mt-20 p-4 space-y-3', focusId === listed.id && 'ring-2 ring-primary/40')}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">{listed.userName}</span>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  listed.status === 'open'
                    ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                )}
              >
                {listed.status}
              </Badge>
              {waiting && (
                <Badge variant="outline" className="border-sky-500/25 bg-sky-500/10 text-xs text-sky-700 dark:text-sky-400">
                  Waiting on you
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{listed.userEmail}</p>
          </div>

          {listed.status === 'open' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingId === listed.id}
              onClick={() => void resolve(listed)}
              className="text-xs"
            >
              {savingId === listed.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
              Mark resolved
            </Button>
          )}
        </div>

        {!isOpen && <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{listed.message}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-x-3 font-mono text-xs text-muted-foreground">
            <span>{listed.path}</span>
            <span>{new Date(listed.createdAt).toLocaleString()}</span>
          </div>
          <button
            type="button"
            onClick={() => toggle(listed.id)}
            aria-expanded={isOpen}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            {isOpen ? 'Hide conversation' : listed.replyCount > 0 ? `Conversation (${listed.replyCount})` : 'Reply'}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} aria-hidden />
          </button>
        </div>

        {isOpen && (
          <div className="border-t border-border pt-4">
            {threads[listed.id] ? (
              <ReportThread report={report} viewer="staff" onReply={(message, res) => reply(listed, message, res)} />
            ) : (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation…
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="w-full space-y-5 px-4 py-6 pb-10 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-foreground">Issue reports</h1>
          <Badge variant="destructive">Admin</Badge>
          {openCount > 0 && <Badge variant="outline">{openCount} open</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          Reply to a learner and they get a notification. They can answer back until the report is resolved.
        </p>
      </div>

      {pinned && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Opened from a notification</p>
            <button type="button" onClick={clearFocus} className="text-xs text-primary hover:underline">
              Dismiss
            </button>
          </div>
          {renderCard(pinned)}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {([
          ['open', 'Open'],
          ['resolved', 'Resolved'],
          ['', 'All'],
        ] as const).map(([value, label]) => (
          <Button
            key={label}
            type="button"
            variant={status === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => pick(value)}
            className="text-xs"
          >
            {label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-[11px] text-rose-600 dark:text-rose-400">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading reports…</span>
        </div>
      )}

      {!loading && reports.length === 0 && !error && (
        <Card className="space-y-2 p-10 text-center">
          <MessageSquareWarning className="mx-auto h-8 w-8 text-muted-foreground" />
          <CardTitle className="text-sm">Nothing here</CardTitle>
          <CardDescription className="text-xs">
            {status === 'open' ? 'No open reports. ' : ''}Learners have not reported anything matching this filter.
          </CardDescription>
        </Card>
      )}

      <div className="space-y-3">{reports.map(renderCard)}</div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs" disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" className="text-xs" disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset(offset + PAGE_SIZE)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
