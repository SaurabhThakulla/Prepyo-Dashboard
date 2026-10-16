import React, { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Check, Gift, Loader2, LogOut, LucideIcon, Pencil, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { formatExamDate } from '@/lib/dates';
import { InstitutionStatus, logOut } from './api';
import { useInstitutionAccount } from './account';
import { dashboardPath, LOGIN_PATH } from './paths';
import InstitutionPage, { InstitutionLoading } from './InstitutionPage';
import StudentsCard from './StudentsCard';
import StudentLoginPage from './StudentLoginPage';
import SetupPage from './SetupPage';
import BrandMark from './BrandMark';
import { branchesLabel, examName, studentRangeLabel } from './profile';

const FREE_TEXT =
  'Your students can practise reading and listening. AI scoring for speaking and writing, the AI tutor and full mocks need a paid plan. Contact Prepyo to upgrade.';

const STATUS: Record<InstitutionStatus, { label: string; color: string; icon: LucideIcon; title: string; text: string }> = {
  free: {
    label: 'Free plan',
    color: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25',
    icon: Gift,
    title: 'You are on the free plan',
    text: FREE_TEXT,
  },
  active: {
    label: 'Active',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    icon: Check,
    title: 'Your paid plan is active',
    text: 'AI scoring and the AI tutor are switched on for your students.',
  },
  expired: {
    label: 'Expired',
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    icon: ShieldAlert,
    title: 'Your paid period has ended',
    text: `You are back on the free plan. ${FREE_TEXT}`,
  },
};

/** /<name>: the institution's own page. Its admin sees the dashboard, everyone else the student sign-in. */
export default function DashboardPage() {
  const { code = '' } = useParams<{ code: string }>();
  const { account, setAccount } = useInstitutionAccount();
  const [signingOut, setSigningOut] = useState(false);
  const [editing, setEditing] = useState(false);

  if (account === undefined) return <InstitutionLoading />;
  // An admin who just signed out goes to the admin login; to anyone else this address is the student sign-in.
  if (account === null) return signingOut ? <Navigate to={LOGIN_PATH} replace /> : <StudentLoginPage />;

  const { admin, institution } = account;
  // An admin only ever sees their own institution, whatever address they typed.
  if (code !== institution.code) return <Navigate to={dashboardPath(institution.code)} replace />;

  const status = STATUS[institution.status] ?? STATUS.free;
  const StatusIcon = status.icon;
  const { profile } = institution;

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logOut();
    } finally {
      setAccount(null);
    }
  };

  // The dashboard opens only once the setup is finished.
  if (!institution.onboarded) return <SetupPage account={account} onSaved={setAccount} onSignOut={signOut} />;
  if (editing) {
    return (
      <SetupPage
        account={account}
        onSaved={saved => {
          setAccount(saved);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <InstitutionPage title={institution.name} subtitle="Institution dashboard" wide>
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: profile.brandColor || undefined }} />
          <div className="flex flex-wrap items-center gap-4 p-5">
            <BrandMark name={institution.name} logoUrl={institution.logoUrl} color={profile.brandColor} className="h-14 w-14 rounded-2xl text-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                {profile.city} · {branchesLabel(profile.branches)} · {studentRangeLabel(profile.monthlyStudents)} students a month
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.exams.map(exam => (
                  <Badge key={exam} variant="secondary" className="rounded-full">{examName(exam)}</Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="rounded-full text-xs font-bold">
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit details
            </Button>
          </div>
        </Card>

        <Card className="flex gap-3 p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <StatusIcon className="h-4 w-4 text-foreground" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <Badge variant="outline" className={status.color}>{status.label}</Badge>
            <CardTitle className="text-base">{status.title}</CardTitle>
            <CardDescription>{status.text}</CardDescription>
            {institution.validUntil && (
              <p className="text-xs text-muted-foreground">
                {institution.status === 'expired' ? 'Ended on' : 'Paid until'}{' '}
                <span className="font-semibold text-foreground">{formatExamDate(institution.validUntil)}</span>
              </p>
            )}
          </div>
        </Card>

        <StudentsCard code={institution.code} seatLimit={institution.seatLimit} />

        <Card className="space-y-3 p-5">
          <CardTitle className="text-base">Your account</CardTitle>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Admin</dt>
            <dd className="break-words font-semibold text-foreground">{admin.name}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all font-semibold text-foreground">{admin.email}</dd>
          </dl>
        </Card>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={signOut} disabled={signingOut} className="rounded-full text-xs font-bold">
            {signingOut ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <LogOut className="mr-1.5 h-3.5 w-3.5" />}
            Sign out
          </Button>
        </div>
      </div>
    </InstitutionPage>
  );
}
