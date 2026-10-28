import React, { useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { ExamCode, InstitutionAccount, logOut } from './api';
import { useInstitutionAccount } from './account';
import { dashboardPath, LOGIN_PATH, sectionPath } from './paths';
import { InstitutionLoading } from './InstitutionPage';
import InstitutionLayout, { InstitutionSection } from './InstitutionLayout';
import BatchesSection from './BatchesSection';
import FeesSection from './FeesSection';
import SettingsSection from './SettingsSection';
import SubscriptionSection from './SubscriptionSection';
import StudentsPage from './StudentsCard';
import StudentLoginPage from './StudentLoginPage';
import { EXAM_CHOICES } from './profile';
import { PageHero } from './ui';
import { Layers, Settings as SettingsIcon, Wallet } from 'lucide-react';

const TITLES: Record<InstitutionSection, string> = {
  overview: 'Students',
  batches: 'Batches',
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

  if (account === undefined) return <InstitutionLoading />;
  // An admin who just signed out goes to the admin login; to anyone else this address is the student sign-in.
  if (account === null) {
    if (signingOut) return <Navigate to={LOGIN_PATH} replace />;
    return section === 'overview' ? <StudentLoginPage /> : <Navigate to={dashboardPath(code)} replace />;
  }

  const { institution } = account;
  // Students used to have a page of their own; they are the main page now.
  if (section === 'students') return <Navigate to={dashboardPath(institution.code) + search} replace />;
  // An admin only ever sees their own institution, whatever address they typed.
  if (code !== institution.code) return <Navigate to={sectionPath(institution.code, section in TITLES ? section : 'overview')} replace />;
  if (!(section in TITLES)) return <Navigate to={dashboardPath(institution.code)} replace />;
  const page = section as InstitutionSection;

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logOut();
    } finally {
      setAccount(null);
    }
  };

  // Prepyo sets the institution up when it creates it, so there is no setup to go
  // through: the admin changes the details on the Settings page.
  return (
    <InstitutionLayout account={account} title={TITLES[page]} signingOut={signingOut} onSignOut={signOut}>
      {page === 'overview' && <StudentsPage account={account} exams={studentExams(institution)} />}
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
      {page === 'subscription' && <SubscriptionSection account={account} />}
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
