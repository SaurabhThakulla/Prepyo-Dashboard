import React from 'react';
import { StudyPlanData, WeakestSkillFocus } from '@/lib/types';
import StudyPlanCalendar from '@/components/dashboard/StudyPlanCalendar';

interface FocusPanelProps {
  onAskCoach?: () => void;
  weakestSkill?: WeakestSkillFocus;
  studyPlan?: StudyPlanData;
}

/**
 * Right column: Study plan calendar.
 */
export default function FocusPanel({ studyPlan }: FocusPanelProps) {
  return (
    <div className="lg:col-span-5 space-y-5">
      {/* Study Plan Calendar Widget */}
      <StudyPlanCalendar studyPlan={studyPlan} />
    </div>
  );
}


