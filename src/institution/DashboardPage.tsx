import React, { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ExamCode, InstitutionAccount, logOut } from './api';
import { useInstitutionAccount } from './account';
import { dashboardPath, LOGIN_PATH, sectionPath } from './paths';
import { InstitutionLoading } from './InstitutionPage';
import InstitutionLayout, { InstitutionSection } from './InstitutionLayout';
import OverviewSection from './OverviewSection';
import SettingsSection from './SettingsSection';
import StudentsCard from './StudentsCard';
import StudentLoginPage from './StudentLoginPage';
import SetupPage from './SetupPage';
import { EXAM_CHOICES } from './profile';

const TITLES: Record<InstitutionSection, string> = {
  overview: 'Overview',
  students: 'Students',
  settings: 'Settings',
};

/** /<name>[/<page>]: the institution's own address. Its admin sees the dashboard, everyone else the student sign-in. */
export default function DashboardPage() {
  const { code = '', section = 'overview' } = useParams<{ code: string; section: string }>();
  const navigate = useNavigate();
  const { account, setAccount } = useInstitutionAccount();
  const [signingOut, setSigningOut] = useState(false);
  const [editing, setEditing] = useState(false);

  if (account === undefined) return <InstitutionLoading />;
  // An admin who just signed out goes to the admin login; to anyone else this address is the student sign-in.
  if (account === null) {
    if (signingOut) return <Navigate to={LOGIN_PATH} replace />;
    return section === 'overview' ? <StudentLoginPage /> : <Navigate to={dashboardPath(code)} replace />;
  }

  const { institution } = account;
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

  // Prepyo sets the institution up when it creates it, so there is no setup to finish first;
  // the setup page only edits the details from Settings.
  if (editing) {
    return (
      <SetupPage
        account={account}
        onSaved={saved => {
          setAccount(saved);
          setEditing(false);
          navigate(sectionPath(saved.institution.code, 'settings'));
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <InstitutionLayout account={account} title={TITLES[page]} signingOut={signingOut} onSignOut={signOut}>
      {page === 'overview' && <OverviewSection account={account} />}
      {page === 'students' && (
        <StudentsCard
          code={institution.code}
          seatLimit={institution.seatLimit}
          exams={studentExams(institution)}
        />
      )}
      {page === 'settings' && <SettingsSection account={account} onEdit={() => setEditing(true)} />}
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
