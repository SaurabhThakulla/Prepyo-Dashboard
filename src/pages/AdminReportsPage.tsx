import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, MessageSquareWarning } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';

interface IssueReport {
  id: string;
  userName: string;
  userEmail: string;
  path: string;
  message: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

const PAGE_SIZE = 20;

/**
 * The issue queue.
 *
 * Reports used to be emailed. Nothing recorded that a learner had reported
 * anything, so a failed send or an unread inbox lost it silently. They are rows
 * now, and this is where they are worked through.
 */
export default function AdminReportsPage() {
  const toast = useToast();

  const [reports, setReports] = useState<IssueReport[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<'open' | 'resolved' | ''>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (status) params.set('status', status);

      const data = await api.get<{
        reports: IssueReport[];
        openCount: number;
        meta: { total: number };
      }>(`/admin/reports?${params}`);

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
    load();
  }, [load]);

  const resolve = async (report: IssueReport) => {
    setSavingId(report.id);
    try {
      await api.patch(`/admin/reports/${report.id}/resolve`, {});
      toast.success('Report resolved', `${report.userName}'s report is closed.`);
      load();
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

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5 pb-10">
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-foreground">Issue reports</h1>
          <Badge variant="destructive">Admin</Badge>
          {openCount > 0 && (
            <Badge variant="outline" className="font-bold">
              {openCount} open
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Everything learners send from the Report an issue dialog. Reports are stored, not emailed.
        </p>
      </div>

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
            className="font-bold text-xs"
          >
            {label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[11px] font-medium text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading reports…</span>
        </div>
      )}

      {!loading && reports.length === 0 && !error && (
        <Card className="p-10 text-center space-y-2">
          <MessageSquareWarning className="w-8 h-8 text-muted-foreground mx-auto" />
          <CardTitle className="text-sm">Nothing here</CardTitle>
          <CardDescription className="text-xs">
            {status === 'open' ? 'No open reports. ' : ''}Learners have not reported anything matching this filter.
          </CardDescription>
        </Card>
      )}

      <div className="space-y-3">
        {reports.map(report => (
          <Card key={report.id} className="p-4 space-y-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{report.userName}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      report.status === 'open'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25'
                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                    }`}
                  >
                    {report.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{report.userEmail}</p>
              </div>

              {report.status === 'open' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={savingId === report.id}
                  onClick={() => resolve(report)}
                  className="font-bold text-xs"
                >
                  {savingId === report.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Mark resolved
                </Button>
              )}
            </div>

            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{report.message}</p>

            <div className="flex flex-wrap gap-x-3 text-[10px] text-muted-foreground font-mono">
              <span>{report.path}</span>
              <span>{new Date(report.createdAt).toLocaleString()}</span>
            </div>
          </Card>
        ))}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-bold text-xs"
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-bold text-xs"
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
