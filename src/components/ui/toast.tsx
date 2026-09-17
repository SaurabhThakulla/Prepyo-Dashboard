import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export function ToastProvider({ children, position = 'top-right' }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, description, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, description, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 active toasts

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const success = useCallback(
    (title: string, description?: string) =>
      showToast({ type: 'success', title, description }),
    [showToast]
  );

  const error = useCallback(
    (title: string, description?: string) =>
      showToast({ type: 'error', title, description, duration: 5000 }),
    [showToast]
  );

  const info = useCallback(
    (title: string, description?: string) =>
      showToast({ type: 'info', title, description }),
    [showToast]
  );

  const warning = useCallback(
    (title: string, description?: string) =>
      showToast({ type: 'warning', title, description, duration: 4500 }),
    [showToast]
  );
  const isTop = position.startsWith('top');
  const positionClasses: Record<string, string> = {
    'top-right': 'top-4 right-4 sm:top-6 sm:right-6',
    'top-left': 'top-4 left-4 sm:top-6 sm:left-6',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 sm:top-6',
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6',
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        success,
        error,
        info,
        warning,
      }}
    >
      {children}

      {/* Global Toast Container */}
      <div
        aria-live="polite"
        className={cn('fixed z-[9999] flex flex-col gap-3 max-w-md w-[calc(100%-2rem)] sm:w-full pointer-events-none', positionClasses[position] || positionClasses['top-right'])}
      >
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isSuccess = t.type === 'success';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              role={isError ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in zoom-in-95',
                isTop ? 'slide-in-from-top-4' : 'slide-in-from-bottom-4',
                isSuccess &&
                'bg-emerald-950/90 text-emerald-100 border-emerald-500/40 shadow-emerald-950/40 dark:bg-emerald-950/95',
                isError &&
                'bg-rose-950/90 text-rose-100 border-rose-500/40 shadow-rose-950/40 dark:bg-rose-950/95',
                isWarning &&
                'bg-amber-950/90 text-amber-100 border-amber-500/40 shadow-amber-950/40 dark:bg-amber-950/95',
                t.type === 'info' &&
                'bg-slate-900/90 text-slate-100 border-border shadow-slate-950/40'
              )}
            >
              {/* Variant Icon */}
              <div className="shrink-0 mt-0.5">
                {isSuccess && (
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                {isError && (
                  <div className="h-8 w-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
                {isWarning && (
                  <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                )}
                {t.type === 'info' && (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Info className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-sm sm:text-base font-bold leading-snug tracking-tight">{t.title}</h4>
                {t.description && (
                  <p className="text-xs sm:text-sm opacity-90 mt-1 leading-relaxed font-normal">
                    {t.description}
                  </p>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="shrink-0 p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
