import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Shown to a free institution's student in place of a speaking or writing task. */
export default function FreePlanNotice() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
        <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="font-display text-xl font-black text-foreground">Not included in your institution&apos;s free plan</h1>
      <p className="text-sm text-muted-foreground">
        Speaking and writing are marked by AI, which the free plan does not include. Reading and listening practice
        are open to you. Ask your institution about upgrading.
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        <Button asChild size="sm" className="rounded-xl text-xs font-bold">
          <Link to="/practice?skill=reading">Practise reading</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
          <Link to="/practice?skill=listening">Practise listening</Link>
        </Button>
      </div>
    </div>
  );
}
