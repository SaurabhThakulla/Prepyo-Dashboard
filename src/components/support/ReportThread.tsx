import React, { useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface ReportReply {
  id: string;
  fromStaff: boolean;
  authorName: string;
  message: string;
  createdAt: string;
}

export interface IssueReport {
  id: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  path: string;
  message: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  replyCount: number;
  lastFromLearner?: boolean;
  replies?: ReportReply[];
}

interface Props {
  report: IssueReport;
  /** Whose screen this is: staff see the learner's name, learners see "You". */
  viewer: 'staff' | 'learner';
  onReply: (message: string, resolve: boolean) => Promise<void>;
}

const MAX_MESSAGE = 4000;

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/**
 * One report as a conversation: the learner's first message, then every reply,
 * with the viewer's own messages on the right like a chat.
 */
export default function ReportThread({ report, viewer, onReply }: Props) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState<'reply' | 'resolve' | null>(null);

  const messages = [
    { id: 'first', fromStaff: false, authorName: report.userName, message: report.message, createdAt: report.createdAt },
    ...(report.replies ?? []),
  ];
  const mine = (fromStaff: boolean) => (viewer === 'staff' ? fromStaff : !fromStaff);
  const open = report.status === 'open';

  const send = async (resolve: boolean) => {
    const text = draft.trim();
    if (!text) return;
    setSending(resolve ? 'resolve' : 'reply');
    try {
      await onReply(text, resolve);
      setDraft('');
    } catch {
      // The caller has already told the learner; the draft stays for a retry.
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {messages.map(msg => (
          <li key={msg.id} className={cn('flex', mine(msg.fromStaff) ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] space-y-1 rounded-2xl px-4 py-2.5',
                mine(msg.fromStaff) ? 'rounded-br-md bg-primary/10' : 'rounded-bl-md bg-muted/60',
              )}
            >
              <p className="text-[11px] text-muted-foreground">
                {mine(msg.fromStaff) ? 'You' : msg.fromStaff ? 'Prepyo team' : msg.authorName} · {when(msg.createdAt)}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{msg.message}</p>
            </div>
          </li>
        ))}
      </ol>

      {open ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={e => setDraft(e.target.value.slice(0, MAX_MESSAGE))}
            placeholder={viewer === 'staff' ? 'Write a reply to the learner…' : 'Add more detail or answer the team…'}
            rows={3}
            aria-label="Reply"
            className="resize-none text-sm"
          />
          <div className="flex flex-wrap justify-end gap-2">
            {viewer === 'staff' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!draft.trim() || sending !== null}
                onClick={() => void send(true)}
              >
                {sending === 'resolve' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                Reply and resolve
              </Button>
            )}
            <Button type="button" size="sm" disabled={!draft.trim() || sending !== null} onClick={() => void send(false)}>
              {sending === 'reply' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              Send reply
            </Button>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          Resolved{report.resolvedAt ? ` on ${when(report.resolvedAt)}` : ''}.
          {viewer === 'learner' && ' If something is still wrong, send a new report.'}
        </p>
      )}
    </div>
  );
}
