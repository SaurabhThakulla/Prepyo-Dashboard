import React, { useState } from 'react';
import { Bell, Loader2, Megaphone } from 'lucide-react';
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
    <Card className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="space-y-5 lg:col-span-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white">
              <Megaphone className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">New announcement</CardTitle>
              <CardDescription className="text-sm text-foreground/60">
                Sends a notification to every learner, for example when new tests are added.
              </CardDescription>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="announcement-title" className="text-sm font-bold text-foreground">
                Title
              </label>
              <Input
                id="announcement-title"
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, MAX_TITLE))}
                placeholder="New IELTS listening tests added"
              />
              {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="announcement-message" className="text-sm font-bold text-foreground">
                Message
              </label>
              <Textarea
                id="announcement-message"
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                placeholder="Five new Section 3 recordings are ready to practise."
                rows={4}
                className="resize-none"
              />
              <div className="flex justify-between gap-2 text-xs text-foreground/60">
                <span className="text-destructive">{fieldErrors.message}</span>
                <span className="tabular-nums">{message.length}/{MAX_MESSAGE}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="announcement-link" className="text-sm font-bold text-foreground">
                Link <span className="font-normal text-foreground/60">(optional)</span>
              </label>
              <Input
                id="announcement-link"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="/practice?skill=listening"
              />
              {fieldErrors.actionUrl && <p className="text-xs text-destructive">{fieldErrors.actionUrl}</p>}
            </div>
          </div>

          {confirming ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Send this to every learner? It cannot be unsent.</p>
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
              <Button type="button" disabled={!ready} onClick={() => setConfirming(true)} className="font-bold">
                <Megaphone className="mr-1.5 h-4 w-4" />
                Send to all learners
              </Button>
            </div>
          )}
        </div>

        {/* What learners will see, updated as the admin types. */}
        <div className="space-y-3 lg:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wide text-foreground/60">Preview</p>
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <div className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className={`text-sm font-bold break-words ${title.trim() ? 'text-foreground' : 'text-foreground/40'}`}>
                  {title.trim() || 'Your title appears here'}
                </p>
                <p className={`text-sm whitespace-pre-line break-words ${message.trim() ? 'text-foreground/75' : 'text-foreground/40'}`}>
                  {message.trim() || 'Your message appears here.'}
                </p>
                {link.trim() && (
                  <p className="pt-1 text-xs font-bold text-primary break-all">Opens {link.trim()} →</p>
                )}
                <p className="pt-1 text-xs text-foreground/50">Just now</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
