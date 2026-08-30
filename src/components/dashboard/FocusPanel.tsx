'use client';

import React from 'react';
import Link from 'next/link';

interface FocusPanelProps {
  onAskCoach: () => void;
}

/**
 * Right column: the skill to work on next, and a way into the evaluator.
 *
 * The weakest-skill copy is still hardcoded — there is no endpoint behind it
 * yet. See the note in src/app/dashboard/page.tsx.
 */
export default function FocusPanel({ onAskCoach }: FocusPanelProps) {
  return (
    <div className="lg:col-span-5 space-y-5">
      <div className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Weakest skill</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            LAST 7 DAYS
          </span>
        </div>

        <div className="border-l-2 border-l-rose-500 dark:border-l-[#ff5c5c] bg-rose-50/50 dark:bg-white/[0.02] pl-3.5 py-2 rounded-r-lg space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Summarise written text</span>
            <span className="text-xs font-bold text-rose-600 dark:text-[#ff5c5c]">68/90</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-normal leading-relaxed">
            Your single-sentence constraint was broken. Keep responses under 75 words with one main clause.
          </p>
        </div>

        <Link
          href="/practice?skill=writing"
          className="w-full bg-emerald-500 hover:bg-emerald-600 dark:bg-[#00e599] dark:hover:bg-[#00d08a] text-white dark:text-black font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 dark:shadow-[#00e599]/15 flex items-center justify-center text-center"
        >
          Practice 2 summaries
        </Link>

        <button
          type="button"
          onClick={onAskCoach}
          className="w-full bg-muted/50 hover:bg-muted dark:bg-[#181c24] dark:hover:bg-[#222733] border border-border dark:border-white/10 text-foreground dark:text-white font-medium text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center text-center"
        >
          Ask AI Coach for a strategy
        </button>
      </div>

      <div className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-6 space-y-3 shadow-sm">
        <h3 className="text-sm font-bold text-foreground">AI Evaluator Lab</h3>
        <p className="text-[11px] text-muted-foreground font-normal leading-relaxed">
          Submit a writing or speaking response and get sentence-level feedback in seconds.
        </p>
        <div className="pt-1">
          <Link
            href="/evaluations"
            className="bg-muted/50 hover:bg-muted dark:bg-[#181c24] dark:hover:bg-[#222733] border border-border dark:border-white/10 text-foreground dark:text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors inline-block"
          >
            Open evaluator
          </Link>
        </div>
      </div>
    </div>
  );
}
