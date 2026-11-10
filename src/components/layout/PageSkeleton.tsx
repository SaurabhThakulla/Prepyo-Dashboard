import React from 'react';
import {
  DashboardPageSkeleton,
  PracticePageSkeleton,
  ReadingPracticeSkeleton,
  MocksPageSkeleton,
  MistakesPageSkeleton,
  SubscriptionPageSkeleton,
  DiagnosticPageSkeleton,
  AdminPageSkeleton,
} from './skeletons/DashboardSkeletons';

export type PageSkeletonVariant =
  | 'dashboard'
  | 'practice'
  | 'reading'
  | 'reading-mcq'
  | 'mocks'
  | 'mistakes'
  | 'subscription'
  | 'diagnostic'
  | 'admin';

export interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  bare?: boolean;
}

export default function PageSkeleton({ variant = 'dashboard', bare = false }: PageSkeletonProps) {
  switch (variant) {
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
    case 'subscription':
      return <SubscriptionPageSkeleton />;
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
  PracticePageSkeleton,
  ReadingPracticeSkeleton,
  MocksPageSkeleton,
  MistakesPageSkeleton,
  SubscriptionPageSkeleton,
  DiagnosticPageSkeleton,
  AdminPageSkeleton,
};
