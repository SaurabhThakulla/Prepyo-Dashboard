import React, { Suspense } from 'react';
import { RefreshCw } from 'lucide-react';
import PracticeScreen from '@/components/practice/PracticeScreen';

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      }
    >
      <PracticeScreen />
    </Suspense>
  );
}
