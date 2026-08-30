import React from 'react';
import { useApp } from '@/context/AppContext';
import { Bell, Check, Flame, Award, AlertCircle, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ open, onClose }: Props) {
  const { notifications, markNotificationAsRead } = useApp();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-sm w-full bg-card border-l border-border shadow-2xl p-5 flex flex-col z-50 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-foreground">Notifications</h3>
              <p className="text-xs text-muted-foreground">{notifications.filter(n => !n.read).length} unread</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No notifications yet.
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  notif.read
                    ? 'bg-muted/40 border-border opacity-75'
                    : 'bg-background border-primary/30 shadow-md shadow-primary/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {notif.type === 'streak' && <Flame className="w-4 h-4 text-amber-500 shrink-0" />}
                    {notif.type === 'evaluation' && <Award className="w-4 h-4 text-primary shrink-0" />}
                    {notif.type === 'system' && <AlertCircle className="w-4 h-4 text-nepal-emerald shrink-0" />}
                    <h4 className="font-semibold text-xs text-foreground">{notif.title}</h4>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={() => markNotificationAsRead(notif.id)}
                      className="text-[10px] text-primary hover:text-primary/80 font-medium shrink-0 flex items-center gap-0.5"
                    >
                      <Check className="w-3 h-3" /> Read
                    </button>
                  )}
                </div>
                <p className="text-xs text-foreground/90 mt-1.5 leading-relaxed">{notif.message}</p>
                {notif.actionUrl && (
                  <Link
                    to={notif.actionUrl}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold mt-2.5"
                  >
                    <span>View details</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border text-center">
          <p className="text-[11px] text-muted-foreground">Prepyo Study Alerts & Daily Streak Reminders</p>
        </div>
      </div>
    </div>
  );
}
