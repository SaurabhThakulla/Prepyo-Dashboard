import React from 'react';
import {
  DashboardPageSkeleton,
  EvaluationsPageSkeleton,
  ProfilePageSkeleton,
  PracticePageSkeleton,
  ReadingPracticeSkeleton,
  MocksPageSkeleton,
  MistakesPageSkeleton,
  LeaderboardPageSkeleton,
  SubscriptionPageSkeleton,
  ReferralsPageSkeleton,
  DiagnosticPageSkeleton,
  AdminPageSkeleton,
} from './skeletons/DashboardSkeletons';

export type PageSkeletonVariant =
  | 'dashboard'
  | 'evaluations'
  | 'profile'
  | 'practice'
  | 'reading'
  | 'reading-mcq'
  | 'mocks'
  | 'mistakes'
  | 'leaderboard'
  | 'subscription'
  | 'referrals'
  | 'diagnostic'
  | 'admin';

export interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  bare?: boolean;
}

export default function PageSkeleton({ variant = 'dashboard', bare = false }: PageSkeletonProps) {
  switch (variant) {
    case 'evaluations':
      return <EvaluationsPageSkeleton />;
    case 'profile':
      return <ProfilePageSkeleton />;
    case 'practice':
      return <PracticePageSkeleton bare={bare} />;
    // Every reading task loads into the same two-pane layout, so they share one
    // skeleton. Sending the non-MCQ ones to the single-card practice skeleton
    // made reading flash a different shape depending on the task type.
    case 'reading-mcq':
    case 'reading':
      return <ReadingPracticeSkeleton bare={bare} />;
    case 'mocks':
      return <MocksPageSkeleton bare={bare} />;
    case 'mistakes':
      return <MistakesPageSkeleton bare={bare} />;
    case 'leaderboard':
      return <LeaderboardPageSkeleton bare={bare} />;
    case 'subscription':
      return <SubscriptionPageSkeleton />;
    case 'referrals':
      return <ReferralsPageSkeleton />;
    case 'diagnostic':
      return <DiagnosticPageSkeleton />;
    case 'admin':
      return <AdminPageSkeleton bare={bare} />;
    case 'dashboard':
    default:
      return <DashboardPageSkeleton />;
  }
}

export {
  PageSkeleton,
  DashboardPageSkeleton,
  EvaluationsPageSkeleton,
  ProfilePageSkeleton,
  PracticePageSkeleton,
  ReadingPracticeSkeleton,
  MocksPageSkeleton,
  MistakesPageSkeleton,
  LeaderboardPageSkeleton,
  SubscriptionPageSkeleton,
  ReferralsPageSkeleton,
  DiagnosticPageSkeleton,
  AdminPageSkeleton,
};
