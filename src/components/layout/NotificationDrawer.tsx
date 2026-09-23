import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  CreditCard,
  Flame,
  Gift,
  Gauge,
  Info,
  Loader2,
  Megaphone,
  MessageSquare,
  Target,
  X,
  CalendarClock,
  Trash2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Each kind of notice gets its own icon and colour, so the list scans at a glance. */
const KIND: Record<string, { icon: React.ElementType; tone: string }> = {
  payment: { icon: CreditCard, tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  plan: { icon: CalendarClock, tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  limit: { icon: Gauge, tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  report: { icon: MessageSquare, tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  evaluation: { icon: Award, tone: 'bg-primary/10 text-primary' },
  mission: { icon: Target, tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  streak: { icon: Flame, tone: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  referral: { icon: Gift, tone: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  announcement: { icon: Megaphone, tone: 'bg-primary/10 text-primary' },
  system: { icon: Info, tone: 'bg-muted text-muted-foreground' },
};

/** "just now", "5m", "3h", "2d", then a date. */
function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function NotificationDrawer({ open, onClose }: Props) {
  const {
    notifications,
    unreadCount,
    hasMoreNotifications,
    loadMoreNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useApp();
  const navigate = useNavigate();
  const [loadingMore, setLoadingMore] = useState(false);
  // Clearing everything asks once more; deleting one notice does not.
  const [confirmingClear, setConfirmingClear] = useState(false);

  if (!open) return null;

  const close = () => {
    setConfirmingClear(false);
    onClose();
  };

  const openNotification = (notif: NotificationItem) => {
    if (!notif.read) void markNotificationAsRead(notif.id);
    if (notif.actionUrl) {
      close();
      navigate(notif.actionUrl);
    }
  };

  const showMore = async () => {
    setLoadingMore(true);
    try {
      await loadMoreNotifications();
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Notifications">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />

      <div className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-sm sm:max-w-md flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="border-b border-border px-4 sm:px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                <Bell className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold text-foreground whitespace-nowrap">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary whitespace-nowrap">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount === 0 && (
                  <p className="text-xs text-muted-foreground whitespace-nowrap">All caught up</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close notifications"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {(unreadCount > 0 || notifications.length > 0) && (
            <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
              <div>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => void markAllNotificationsAsRead()}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
                  >
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden /> Mark all read
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground px-2">All read</span>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmingClear(true)}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {confirmingClear && (
          <div role="alertdialog" aria-label="Clear all notifications" className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-5 py-3">
            <p className="text-xs text-foreground">Delete all notifications? This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingClear(false);
                  void clearAllNotifications();
                }}
                className="rounded-lg bg-destructive px-3 py-1.5 text-xs text-destructive-foreground hover:bg-destructive/90"
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="rounded-full bg-muted p-3 text-muted-foreground">
                <BellOff className="h-5 w-5" aria-hidden />
              </div>
              <p className="text-sm text-foreground">No notifications yet</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Payment updates, replies to your reports and daily reminders will show up here.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {notifications.map(notif => {
                const kind = KIND[notif.type] ?? KIND.system;
                const Icon = kind.icon;
                return (
                  <li key={notif.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => openNotification(notif)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl p-3 pr-10 text-left transition-colors hover:bg-muted/60',
                        !notif.read && 'bg-primary/[0.04]',
                      )}
                    >
                      <span className={cn('mt-0.5 shrink-0 rounded-lg p-2', kind.tone)}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="flex items-start justify-between gap-2">
                          <span className={cn('text-sm leading-snug', notif.read ? 'text-muted-foreground' : 'font-medium text-foreground')}>
                            {notif.title}
                          </span>
                        </span>
                        <span className="block text-xs leading-relaxed text-muted-foreground">{notif.message}</span>
                        <span className="flex items-center justify-between pt-0.5 text-[11px] text-muted-foreground/80">
                          <span className="flex items-center gap-1.5">
                            {!notif.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Unread" />}
                            {timeAgo(notif.createdAt)}
                          </span>
                          {notif.actionUrl && (
                            <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                          )}
                        </span>
                      </span>
                    </button>
                    {/* Always visible on touch screens, where there is no hover. */}
                    <button
                      type="button"
                      onClick={() => void deleteNotification(notif.id)}
                      aria-label={`Delete notification: ${notif.title}`}
                      className="absolute right-2 top-2 rounded-lg p-1.5 text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {hasMoreNotifications && (
            <button
              type="button"
              onClick={() => void showMore()}
              disabled={loadingMore}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm text-foreground hover:bg-muted/60 disabled:opacity-60"
            >
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {loadingMore ? 'Loading…' : 'Show more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
