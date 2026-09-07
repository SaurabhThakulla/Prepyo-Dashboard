import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const Card = ({ className = '', children }: { className?: string; children: React.ReactNode }) => (
  <div className={`bg-card dark:bg-[#12161c] border border-border/80 dark:border-white/10 rounded-2xl p-5 shadow-xs ${className}`}>{children}</div>
);
const Shell = ({
  label,
  children,
  className,
  bare = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  bare?: boolean;
}) => (
  <div className={`w-full ${className ?? (bare ? 'space-y-6' : 'px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-12')}`} role="status">
    <span className="sr-only">Loading {label}…</span>
    {children}
  </div>
);
const Header = ({ titleW = 'w-56', actionW }: { titleW?: string; actionW?: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="space-y-2"><Skeleton className={`h-8 ${titleW} rounded-xl`} /><Skeleton className="h-4 w-44 rounded-md" /></div>
    {actionW && <Skeleton className={`h-10 ${actionW} rounded-xl`} />}
  </div>
);
const StatGrid = ({ count = 4, cols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' }: { count?: number; cols?: string }) => (
  <div className={`grid gap-4 ${cols}`}>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="p-4 space-y-3">
        <div className="flex justify-between items-center"><Skeleton className="h-4 w-20 rounded-md" /><Skeleton className="h-5 w-12 rounded-full" /></div>
        <Skeleton className="h-7 w-24 rounded-md" /><Skeleton className="h-1.5 w-full rounded-full" />
        <div className="flex justify-between"><Skeleton className="h-3 w-16 rounded-md" /><Skeleton className="h-3 w-12 rounded-md" /></div>
      </Card>
    ))}
  </div>
);
const ListRows = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-3 pt-1">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex justify-between items-center p-3.5 rounded-xl border border-border/60 bg-muted/20">
        <div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-xl shrink-0" /><div className="space-y-1.5"><Skeleton className="h-3.5 w-32 rounded-md" /><Skeleton className="h-3 w-48 rounded-md" /></div></div>
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
    ))}
  </div>
);

export const DashboardPageSkeleton = () => (
  <Shell label="dashboard" className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-10">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2"><Skeleton className="h-8 w-56 sm:w-72 rounded-xl" /><Skeleton className="h-4 w-44 sm:w-60" /></div>
      <Skeleton className="h-16 w-full sm:w-64 rounded-2xl" />
    </div>
    <StatGrid count={4} />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 space-y-4">
        <div className="flex justify-between pb-2 border-b border-border/60"><Skeleton className="h-5 w-40" /><Skeleton className="h-8 w-28 rounded-xl" /></div>
        <ListRows count={4} />
      </Card>
      <Card className="space-y-4">
        <div className="flex justify-between pb-2 border-b border-border/60"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-12" /></div>
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="space-y-2.5 pt-2"><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-10 w-full rounded-xl" /></div>
      </Card>
    </div>
  </Shell>
);

export const EvaluationsPageSkeleton = () => (
  <Shell label="writing evaluator">
    <Header titleW="w-48" actionW="w-44 rounded-full" />
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <Card className="lg:col-span-7 p-6 space-y-4">
        <Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" />
        <div className="flex justify-between pt-2"><Skeleton className="h-9 w-24 rounded-xl" /><Skeleton className="h-9 w-36 rounded-xl" /></div>
      </Card>
      <Card className="lg:col-span-5 p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[360px]">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-44 rounded-md" />
        <Skeleton className="h-3.5 w-60 rounded-md" />
      </Card>
    </div>
  </Shell>
);

export const ProfilePageSkeleton = () => (
  <Shell label="profile" className="p-0 pb-12 space-y-6">
    <div className="bg-card border-b border-border/80">
      <Skeleton className="h-48 sm:h-64 w-full rounded-none" />
      <div className="px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border/40">
        <div className="flex items-center gap-4"><Skeleton className="h-20 w-20 -mt-10 rounded-full ring-4 ring-background shrink-0" /><div className="space-y-2"><Skeleton className="h-6 w-44" /><Skeleton className="h-3.5 w-56" /></div></div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
    </div>
    <div className="px-4 sm:px-8 space-y-6">
      <StatGrid count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="flex items-center justify-center p-8"><Skeleton className="h-52 w-52 rounded-full" /></Card>
        <Card className="lg:col-span-2 p-6 space-y-4"><Skeleton className="h-5 w-44" /><Skeleton className="h-48 w-full rounded-xl" /></Card>
      </div>
    </div>
  </Shell>
);

export const PracticePageSkeleton = ({ bare = false }: { bare?: boolean } = {}) => (
  <Shell
    label="practice question"
    bare={bare}
    className={bare ? 'min-h-[420px] flex flex-col' : 'min-h-[calc(100vh-4rem)] p-4 sm:p-6 flex flex-col justify-between'}
  >
    <Card className="p-6 space-y-6 flex-1 flex flex-col justify-between">
      <div className="flex justify-between border-b border-border/80 pb-3.5"><Skeleton className="h-6 w-32 rounded-full" /><Skeleton className="h-6 w-24 rounded-lg" /><Skeleton className="h-6 w-20" /></div>
      <div className="space-y-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-24 w-full rounded-xl" /></div>
      <div className="flex-1 flex items-center justify-center py-6"><Skeleton className="h-32 w-full max-w-xl rounded-2xl" /></div>
      <div className="flex justify-between border-t border-border/70 pt-4"><Skeleton className="h-9 w-28 rounded-xl" /><Skeleton className="h-9 w-32 rounded-xl" /></div>
    </Card>
  </Shell>
);

export const ReadingPracticeSkeleton = ({ bare = false }: { bare?: boolean } = {}) => (
  <Shell
    label="reading passage"
    bare={bare}
    className={bare ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'h-[calc(100vh-4rem)] p-4 grid grid-cols-1 lg:grid-cols-2 gap-4'}
  >
    <Card className="h-full p-6 space-y-3 overflow-hidden"><Skeleton className="h-6 w-1/2 mb-2" />{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</Card>
    <Card className="h-full p-6 space-y-3 flex flex-col justify-between overflow-hidden">
      <div className="space-y-3"><Skeleton className="h-5 w-36 mb-2" />{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      <Skeleton className="h-9 w-28 rounded-xl self-end" />
    </Card>
  </Shell>
);

export const MocksPageSkeleton = ({ bare = false }: { bare?: boolean } = {}) => (
  <Shell label="mock exams" bare={bare} className={bare ? undefined : 'px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-10'}>
    {!bare && <Header titleW="w-64" actionW="w-56" />}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-5 space-y-4"><div className="flex justify-between"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-4 w-16" /></div><Skeleton className="h-5 w-44" /><Skeleton className="h-8 w-full rounded-lg" /><Skeleton className="h-10 w-full rounded-xl" /></Card>
      ))}
    </div>
  </Shell>
);

export const MistakesPageSkeleton = ({ bare = false }: { bare?: boolean } = {}) => (
  <Shell label="mistakes notebook" bare={bare}>
    {!bare && (
      <>
        <Header titleW="w-52" actionW="w-24 rounded-full" />
        <Skeleton className="h-8 w-full max-w-xs rounded-xl" />
      </>
    )}
    <div className="space-y-3.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4 sm:p-5 space-y-3"><div className="flex justify-between"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-4 w-28" /></div><Skeleton className="h-4 w-5/6" /><Skeleton className="h-12 w-full rounded-xl" /></Card>
      ))}
    </div>
  </Shell>
);

export const LeaderboardPageSkeleton = ({ bare = false }: { bare?: boolean } = {}) => (
  <Shell label="leaderboard" bare={bare}>
    {!bare && <Header titleW="w-48" actionW="w-40" />}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
      {[0, 1, 2].map(i => <Card key={i} className="p-5 flex flex-col items-center space-y-3"><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-4 w-28" /><Skeleton className="h-6 w-20 rounded-full" /></Card>)}
    </div>
    <Card className="p-0 divide-y divide-border/60">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 flex justify-between items-center"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-32" /></div><Skeleton className="h-5 w-16 rounded-full" /></div>
      ))}
    </Card>
  </Shell>
);

export const SubscriptionPageSkeleton = () => (
  <Shell label="subscription plans" className="space-y-6 pb-16">
    <Card className="p-6 flex flex-col md:flex-row justify-between gap-4"><Skeleton className="h-12 w-64 rounded-xl" /><Skeleton className="h-14 w-80 rounded-2xl" /></Card>
    <Card className="p-6 space-y-4">
      <div className="grid grid-cols-4 gap-4 pb-4 border-b border-border/60">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}</div>
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="grid grid-cols-4 gap-4 py-2 border-b border-border/40">{[0, 1, 2, 3].map(j => <Skeleton key={j} className="h-4 w-full rounded-md" />)}</div>)}
    </Card>
  </Shell>
);

export const ReferralsPageSkeleton = () => (
  <Shell label="referral rewards" className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-12 space-y-6">
    <Card className="p-8 space-y-4 border-primary/20"><Skeleton className="h-8 w-64 rounded-xl" /><Skeleton className="h-4 w-96" /><Skeleton className="h-11 w-full rounded-xl" /></Card>
    <StatGrid count={4} /><Card className="p-6"><Skeleton className="h-20 w-full rounded-xl" /></Card>
  </Shell>
);

export const DiagnosticPageSkeleton = () => (
  <Shell label="diagnostic exam" className="max-w-4xl mx-auto py-6 px-4 space-y-6">
    <Card className="p-6 sm:p-8 space-y-6">
      <Skeleton className="h-8 w-64 rounded-xl" /><Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[0, 1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      <div className="pt-4 border-t border-border/60 flex justify-end"><Skeleton className="h-11 w-44 rounded-xl" /></div>
    </Card>
  </Shell>
);

export const AdminPageSkeleton = () => (
  <Shell label="admin metrics">
    <Header titleW="w-48" actionW="w-32" /><StatGrid count={4} />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-5 space-y-4"><Skeleton className="h-5 w-40" /><Skeleton className="h-56 w-full rounded-xl" /></Card>
      <Card className="p-5 space-y-4"><Skeleton className="h-5 w-36" /><Skeleton className="h-56 w-full rounded-xl" /></Card>
    </div>
  </Shell>
);
