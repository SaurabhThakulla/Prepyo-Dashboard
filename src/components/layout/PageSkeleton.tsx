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
import { isReadingMultipleChoice } from '@/lib/readingTypes';

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
  type?: string;
  isMultipleChoice?: boolean;
  bare?: boolean;
}

export default function PageSkeleton({
  variant = 'dashboard',
  type,
  isMultipleChoice,
  bare = false,
}: PageSkeletonProps) {
  switch (variant) {
    case 'evaluations':
      return <EvaluationsPageSkeleton />;
    case 'profile':
      return <ProfilePageSkeleton />;
    case 'practice':
      return <PracticePageSkeleton bare={bare} />;
    case 'reading-mcq':
      return <ReadingPracticeSkeleton bare={bare} />;
    case 'reading':
      return isMultipleChoice || isReadingMultipleChoice(type) ? (
        <ReadingPracticeSkeleton bare={bare} />
      ) : (
        <PracticePageSkeleton bare={bare} />
      );
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
      return <AdminPageSkeleton />;
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
