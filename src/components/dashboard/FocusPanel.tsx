import React from 'react';
import { StudyPlanData, UserProfile } from '@/lib/types';
import StudyPlanCalendar from '@/components/dashboard/StudyPlanCalendar';
import CurrentPlanCard from '@/components/dashboard/CurrentPlanCard';

interface FocusPanelProps {
  onAskCoach?: () => void;
  studyPlan?: StudyPlanData;
  user?: UserProfile | null;
}

/**
 * Right column: Your Current Plan & Study plan calendar.
 */
export default function FocusPanel({ studyPlan, user }: FocusPanelProps) {
  return (
    <div className="lg:col-span-5 space-y-5">
      {/* Learner's Subscription Plan Widget */}
      <CurrentPlanCard user={user} />

      {/* Study Plan Calendar Widget */}
      <StudyPlanCalendar studyPlan={studyPlan} />
    </div>
  );
}


