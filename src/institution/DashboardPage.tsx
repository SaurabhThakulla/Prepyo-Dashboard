import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ExamCode, InstitutionAccount, logOut } from './api';
import { useInstitutionAccount } from './account';
import { dashboardPath, sectionPath } from './paths';
import { InstitutionLoading } from './InstitutionPage';
import InstitutionLayout, { InstitutionSection } from './InstitutionLayout';
import BatchesSection from './BatchesSection';
import FeesSection from './FeesSection';
import SettingsSection from './SettingsSection';
import SubscriptionSection from './SubscriptionSection';
import InstituteMocksSection from './InstituteMocks';
import StudentsPage from './StudentsCard';
import StudentLoginPage from './StudentLoginPage';
import { EXAM_CHOICES } from './profile';
import { PageHero } from './ui';
import { CreditCard, Layers, Settings as SettingsIcon, Users, Wallet } from 'lucide-react';

const TITLES: Record<InstitutionSection, string> = {
  overview: 'Students',
  batches: 'Batches',
  mocks: 'Institute Mocks',
  fees: 'Fees',
  subscription: 'Subscription',
  settings: 'Settings',
};

/** /<name>[/<page>]: the institution's own address. Its admin sees the dashboard, everyone else the student sign-in. */
export default function DashboardPage() {
  const { code = '', section = 'overview' } = useParams<{ code: string; section: string }>();
  const { search } = useLocation();
  const { account, setAccount } = useInstitutionAccount();
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();

  if (account === undefined) return <InstitutionLoading />;
  // Signed out (an admin who just left, or anyone else), this address is the
  // institution's own sign-in page; other sections lead back to it.
  if (account === null) {
    return section === 'overview' ? <StudentLoginPage /> : <Navigate to={dashboardPath(code)} replace />;
  }

  const { institution } = account;
  // Students used to have a page of their own; they are the main page now.
  if (section === 'students') return <Navigate to={dashboardPath(institution.code) + search} replace />;
  // An admin only ever sees their own institution, whatever address they typed.
  if (code !== institution.code) return <Navigate to={sectionPath(institution.code, section in TITLES ? section : 'overview')} replace />;
  if (!(section in TITLES)) return <Navigate to={dashboardPath(institution.code)} replace />;
  const page = section as InstitutionSection;

  // The admin stays on the institution's own page, not Prepyo's admin login.
  const signOut = async () => {
    setSigningOut(true);
    try {
      await logOut();
    } finally {
      navigate(dashboardPath(institution.code), { replace: true });
      setAccount(null);
      setSigningOut(false);
    }
  };

  // Prepyo sets the institution up when it creates it, so there is no setup to go
  // through: the admin changes the details on the Settings page.
  return (
    <InstitutionLayout account={account} title={TITLES[page]} signingOut={signingOut} onSignOut={signOut}>
      {page === 'overview' && (
        <div className="space-y-6">
          <PageHero eyebrow="People" eyebrowIcon={Users} title="Students" subtitle={`${institution.name} · who is studying, how active they are, and who needs a nudge`} />
          <StudentsPage account={account} exams={studentExams(institution)} />
        </div>
      )}
      {page === 'batches' && (
        <div className="space-y-6">
          <PageHero eyebrow="Classes" eyebrowIcon={Layers} title="Batches" subtitle={`${institution.name} · group students into classes to follow them together`} />
          <BatchesSection code={institution.code} exams={studentExams(institution)} />
        </div>
      )}
      {page === 'fees' && (
        <div className="space-y-6">
          <PageHero eyebrow="Payments" eyebrowIcon={Wallet} title="Fees" subtitle={`${institution.name} · what each student owes, payments and receipts`} />
          <FeesSection account={account} />
        </div>
      )}
      {page === 'mocks' && <InstituteMocksSection account={account} />}
      {page === 'subscription' && (
        <div className="space-y-6">
          <PageHero eyebrow="Plan" eyebrowIcon={CreditCard} title="Subscription" subtitle={`${institution.name} · your plan, seats and renewal`} />
          <SubscriptionSection account={account} />
        </div>
      )}
      {page === 'settings' && (
        <div className="space-y-6">
          <PageHero eyebrow="Account" eyebrowIcon={SettingsIcon} title="Settings" subtitle={`${institution.name} · your details and sign-in page`} />
          <SettingsSection account={account} onSaved={setAccount} />
        </div>
      )}
    </InstitutionLayout>
  );
}

/**
 * The exams students can be given: only those in Prepyo's plan (the server
 * refuses any other), with the ones the institution teaches first, so a new
 * student starts on its main exam.
 */
function studentExams(institution: InstitutionAccount['institution']): ExamCode[] {
  const plan = institution.planExams?.length ? institution.planExams : EXAM_CHOICES.map(exam => exam.id);
  const taught = institution.profile.exams.filter(exam => plan.includes(exam));
  return [...taught, ...plan.filter(exam => !taught.includes(exam))];
}
