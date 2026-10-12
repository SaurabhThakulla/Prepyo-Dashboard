import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mistake } from '@/lib/types';
import { mistakePracticeHref } from '@/lib/mistakePractice';

export default function MistakePracticeLink({ mistake }: { mistake: Mistake }) {
  return <div className="space-y-2 border-t border-border pt-4">
    {mistake.resolved && <p className="text-sm font-semibold text-emerald-600">Resolved</p>}
    <Button asChild className="h-11 w-full text-sm sm:h-9 sm:w-auto sm:text-xs"><Link to={mistakePracticeHref(mistake)}>Try again in Practice</Link></Button>
  </div>;
}
