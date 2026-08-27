import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Stand-in for an app page while the session check is still in flight.
 *
 * Shaped after the dashboard — a title, a row of stat cards, then content —
 * because that is the layout most protected pages share. It only has to hold
 * roughly the right amount of space so the page does not jump when the real
 * content arrives; matching any single page exactly is not the point.
 */
export default function AppPageSkeleton() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-10" role="status">
      <span className="sr-only">Loading your workspace…</span>

      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 sm:w-72" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-16 w-full sm:w-64 rounded-2xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-5 space-y-3.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Main content beside a narrower rail, the dashboard's usual split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm">
          <Skeleton className="h-5 w-28" />
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
