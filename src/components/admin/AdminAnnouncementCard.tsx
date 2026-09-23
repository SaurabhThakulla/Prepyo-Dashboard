import React, { useState } from 'react';
import { Loader2, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { api, ApiError, errorMessage } from '@/lib/api';

const MAX_TITLE = 120;
const MAX_MESSAGE = 1000;

/**
 * Sends one notification to every learner. It cannot be taken back, so the
 * send button asks once more before it goes.
 */
export default function AdminAnnouncementCard() {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const ready = title.trim() !== '' && message.trim() !== '';

  const send = async () => {
    setSending(true);
    setFieldErrors({});
    try {
      const data = await api.post<{ sent: number }>('/admin/announcements', {
        title: title.trim(),
        message: message.trim(),
        actionUrl: link.trim(),
      });
      toast.success('Announcement sent', `${data.sent} learners will see it in their notifications.`);
      setTitle('');
      setMessage('');
      setLink('');
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFieldErrors(err.fields);
      toast.error('Could not send the announcement', errorMessage(err));
    } finally {
      setSending(false);
      setConfirming(false);
    }
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4 text-primary" aria-hidden /> Announcement
        </CardTitle>
        <CardDescription className="text-xs">
          Sends a notification to every learner, for example when new tests are added.
        </CardDescription>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, MAX_TITLE))}
            placeholder="New IELTS listening tests added"
            aria-label="Announcement title"
          />
          {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
        </div>
        <div className="space-y-1">
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
            placeholder="Five new Section 3 recordings are ready to practise."
            rows={3}
            aria-label="Announcement message"
            className="resize-none"
          />
          <div className="flex justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="text-destructive">{fieldErrors.message}</span>
            <span className="tabular-nums">{message.length}/{MAX_MESSAGE}</span>
          </div>
        </div>
        <div className="space-y-1">
          <Input
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="Optional page to open, e.g. /practice?skill=listening"
            aria-label="Announcement link"
          />
          {fieldErrors.actionUrl && <p className="text-xs text-destructive">{fieldErrors.actionUrl}</p>}
        </div>
      </div>

      {confirming ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-xs text-amber-800 dark:text-amber-300">Send this to every learner? It cannot be unsent.</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={sending} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={sending} onClick={() => void send()}>
              {sending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Yes, send
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button type="button" size="sm" disabled={!ready} onClick={() => setConfirming(true)}>
            Send to all learners
          </Button>
        </div>
      )}
    </Card>
  );
}
