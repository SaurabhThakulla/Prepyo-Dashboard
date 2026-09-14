import React from 'react';
import { StudyPlanData, UserProfile } from '@/lib/types';
import CurrentPlanCard from '@/components/dashboard/CurrentPlanCard';

interface FocusPanelProps {
  onAskCoach?: () => void;
  studyPlan?: StudyPlanData;
  user?: UserProfile | null;
}

/**
 * FocusPanel displaying the user's current plan and quota stats.
 */
export default function FocusPanel({ user }: FocusPanelProps) {
  return (
    <div className="w-full">
      <CurrentPlanCard user={user} />
    </div>
  );
}


