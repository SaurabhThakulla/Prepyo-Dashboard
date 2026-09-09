import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useApp } from '@/context/AppContext';
import { api, errorMessage } from '@/lib/api';
import { formatExamDate } from '@/lib/dates';

interface QueuedPlan {
  id: string;
  planId: string;
  planName: string;
  days: number;
  createdAt: string;
}

/**
 * Plans bought while another one was still running.
 *
 * A purchase no longer overwrites a live plan — that used to move a learner
 * down a tier if the new plan was cheaper. It waits here instead and starts
 * when the current one ends.
 *
 * Starting one early throws away whatever is left of the current plan, so it is
 * an explicit choice with the cost spelled out, not a convenience button.
 */
export default function QueuedPlansCard() {
  const toast = useToast();
  const { user, refreshUser } = useApp();

  const [queued, setQueued] = useState<QueuedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ queued: QueuedPlan[] }>('/subscriptions/queued');
      setQueued(data.queued ?? []);
    } catch {
      // A learner with nothing queued is the normal case; a failure here should
      // not put an error banner on the billing page.
      setQueued([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activate = async (plan: QueuedPlan) => {
    setActivatingId(plan.id);
    try {
      await api.post(`/subscriptions/queued/${plan.id}/activate`, {});
      toast.success('Plan activated', `${plan.planName} is running now for ${plan.days} days.`);
      setConfirmingId(null);
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      toast.error('Could not start that plan', errorMessage(err));
    } finally {
      setActivatingId(null);
    }
  };

  if (loading || queued.length === 0) return null;

  const currentEnds = user?.planValidUntil;

  return (
    <Card className="p-5 space-y-3 border-primary/30 bg-primary/[0.03]">
      <div className="flex items-start gap-2.5">
        <CalendarClock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div>
          <CardTitle className="text-sm">Waiting to start</CardTitle>
          <CardDescription className="text-xs">
            {currentEnds
              ? `These begin when your current plan ends on ${formatExamDate(currentEnds)}.`
              : 'These begin when your current plan ends.'}
          </CardDescription>
        </div>
      </div>

      <div className="space-y-2">
        {queued.map(plan => (
          <div key={plan.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-sm text-foreground">{plan.planName}</span>
                <span className="text-[11px] text-muted-foreground ml-2">{plan.days} days</span>
              </div>

              {confirmingId === plan.id ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={activatingId === plan.id}
                    onClick={() => activate(plan)}
                    className="font-bold text-xs"
                  >
                    {activatingId === plan.id && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                    Yes, start it now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={activatingId === plan.id}
                    onClick={() => setConfirmingId(null)}
                    className="font-bold text-xs"
                  >
                    Keep waiting
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmingId(plan.id)}
                  className="font-bold text-xs"
                >
                  Apply now
                </Button>
              )}
            </div>

            {confirmingId === plan.id && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Starting {plan.planName} now ends your current plan immediately.
                {currentEnds && ` The days left until ${formatExamDate(currentEnds)} will be lost.`}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
