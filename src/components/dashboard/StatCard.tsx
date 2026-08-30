'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  /** Small right-aligned note in the header, e.g. "+11 TO GOAL". */
  note: React.ReactNode;
  /** The big number. */
  value: React.ReactNode;
  /** Small text beside the number, e.g. "/ 79" or "level 5". */
  valueSuffix?: React.ReactNode;
  /** 0–100. Drives the bar under the number. */
  percent: number;
  footer: React.ReactNode;
}

/**
 * One of the three figures across the top of the dashboard. They differ only
 * in their text, so they share this shell rather than repeating the markup.
 */
export default function StatCard({
  label,
  note,
  value,
  valueSuffix,
  percent,
  footer,
}: StatCardProps) {
  return (
    <div className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        {note}
      </div>

      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-foreground tracking-tight">{value}</span>
          {valueSuffix}
        </div>

        <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800/90 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-emerald-500 dark:bg-[#00e599] rounded-full transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
          />
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground font-normal">{footer}</div>
    </div>
  );
}
