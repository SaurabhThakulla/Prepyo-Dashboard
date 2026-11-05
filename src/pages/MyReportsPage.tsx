import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, Loader2, MessageSquare, MessageSquareWarning } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import ReportIssueDialog from '@/components/support/ReportIssueDialog';
import ReportThread, { type IssueReport } from '@/components/support/ReportThread';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * The learner's own reports and the replies from the Prepyo team. A reply
 * notification links here with ?report=<id>, which opens that conversation.
 */
export default function MyReportsPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('report');

  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, IssueReport>>({});
  const [expanded, setExpanded] = useState<string | null>(focusId);
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ reports: IssueReport[] }>('/report');
      setReports(data.reports ?? []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const data = await api.get<{ report: IssueReport }>(`/report/${id}`);
      setThreads(prev => ({ ...prev, [id]: data.report }));
    } catch (err) {
      toast.error('Could not open that report', errorMessage(err));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!focusId) return;
    setExpanded(focusId);
    void loadThread(focusId).then(() =>
      requestAnimationFrame(() => document.getElementById(`report-${focusId}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })),
    );
  }, [focusId, loadThread]);

  const toggle = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!threads[id]) void loadThread(id);
  };

  const reply = async (id: string, message: string) => {
    try {
      const data = await api.post<{ report: IssueReport }>(`/report/${id}/replies`, { message });
      setThreads(prev => ({ ...prev, [id]: data.report }));
      setReports(prev => prev.map(r => (r.id === id ? { ...r, replyCount: data.report.replyCount } : r)));
      toast.success('Reply sent', 'The team will see it and get back to you.');
    } catch (err) {
      toast.error('Could not send that reply', errorMessage(err));
      throw err;
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 pb-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">My reports</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Problems you have told us about, and our replies. You get a notification whenever we answer.
          </p>
        </div>
        <Button type="button" onClick={() => setReporting(true)} className="shrink-0 gap-2 self-start rounded-full px-5 sm:self-auto">
          <MessageSquareWarning className="h-4 w-4" /> Report an issue
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your reports…
        </div>
      ) : reports.length === 0 && !error ? (
        <Card className="flex flex-col items-center gap-5 px-6 py-12 text-center sm:py-16">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden>
            <MessageSquareWarning className="h-7 w-7" />
          </span>
          <div className="space-y-1.5">
            <p className="text-lg font-semibold text-foreground">You have not reported anything yet</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              If something looks wrong, tell us and we will reply here. For example:
            </p>
          </div>
          <ul className="flex flex-wrap justify-center gap-2">
            {['A question or answer is wrong', 'A score looks off', 'Audio will not play'].map(example => (
              <li key={example} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                {example}
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" onClick={() => setReporting(true)} className="rounded-full px-5">
            Report an issue
          </Button>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reports.map(listed => {
            const isOpen = expanded === listed.id;
            const thread = threads[listed.id];
            return (
              <li key={listed.id}>
                <Card id={`report-${listed.id}`} className={cn('scroll-mt-20 space-y-3 p-4', focusId === listed.id && 'ring-2 ring-primary/40')}>
                  <button
                    type="button"
                    onClick={() => toggle(listed.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <span className="min-w-0 space-y-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            listed.status === 'open'
                              ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                          )}
                        >
                          {listed.status === 'open' ? 'Open' : 'Resolved'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(listed.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {listed.replyCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" aria-hidden /> {listed.replyCount}
                          </span>
                        )}
                      </span>
                      {!isOpen && <span className="line-clamp-2 block text-sm text-foreground">{listed.message}</span>}
                    </span>
                    <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} aria-hidden />
                  </button>

                  {isOpen && (
                    <div className="border-t border-border pt-4">
                      {thread ? (
                        <ReportThread report={thread} viewer="learner" onReply={message => reply(listed.id, message)} />
                      ) : (
                        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation…
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ReportIssueDialog
        open={reporting}
        onOpenChange={next => {
          setReporting(next);
          if (!next) void load();
        }}
      />
    </div>
  );
}
