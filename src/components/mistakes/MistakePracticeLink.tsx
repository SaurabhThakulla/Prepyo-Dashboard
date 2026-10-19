import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mistake } from '@/lib/types';
import { mistakePracticeHref } from '@/lib/mistakePractice';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function MistakePracticeLink({ mistake }: { mistake: Mistake }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/70 pt-3.5 mt-1">
      <div>
        {mistake.resolved && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved
          </span>
        )}
      </div>
      <Button
        asChild
        className="h-10 sm:h-9 w-full sm:w-auto px-4 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all group"
      >
        <Link to={mistakePracticeHref(mistake)} className="inline-flex items-center justify-center gap-1.5">
          <span>Try again in Practice</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </Button>
    </div>
  );
}

