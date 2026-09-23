import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bug, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Wording this dialog owns, keyed by the code /api/v1/report returns. */
const ERRORS: Record<string, string> = {
  unauthorized: 'Your session ended. Sign in again and resend this.',
  too_many_requests: 'That is a lot of reports in a short time. Please wait a few minutes.',
  not_configured: 'Reporting is not switched on in this environment yet.',
  send_failed: 'We could not send that just now. Please try again in a moment.',
  bad_request: 'Please write a little about what went wrong.',
};

const GENERIC = 'Something went wrong. Please try again.';

export default function ReportIssueDialog({ open, onOpenChange }: ReportIssueDialogProps) {
  const { pathname } = useLocation();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A fresh dialog every time: nobody wants to find last week's half-written
  // report sitting in the box.
  useEffect(() => {
    if (!open) return;
    setMessage('');
    setSending(false);
    setSent(false);
    setError(null);
  }, [open]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      // This used to be a bare fetch to /api/report, a Next route handler that
      // lived in this repo. The endpoint moved to the Go backend when the app
      // became a static build, so it goes through the normal API client now.
      await api.post('/report', { message: message.trim(), path: pathname });

      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(ERRORS[err.code] ?? GENERIC);
      } else {
        setError('We could not reach Prepyo. Check your connection and try again.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-2xl">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Bug className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base font-bold">Report an issue</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Tell us what went wrong and it goes straight to the team. The page you are on is
            attached automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-1">
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={sending || sent}
            rows={6}
            maxLength={4000}
            placeholder="What happened? What were you expecting instead?"
            className="text-xs resize-none rounded-xl"
          />
          {sent && (
            <p role="status" className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
              Sent. We will reply in your notifications, and you can follow the conversation in{' '}
              <Link to="/reports" onClick={() => onOpenChange(false)} className="underline underline-offset-2">
                My reports
              </Link>
              .
            </p>
          )}
          <div className="flex items-center justify-between gap-3 min-h-[16px]">
            <p className="text-[11px] text-destructive leading-tight">{error}</p>
            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
              {message.length}/4000
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-foreground rounded-xl"
          >
            {sent ? 'Close' : 'Cancel'}
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={sending || sent || !message.trim()}
            className="font-bold text-xs rounded-xl px-5"
          >
            {sent ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sent
              </span>
            ) : sending ? (
              'Sending…'
            ) : (
              'Send report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
