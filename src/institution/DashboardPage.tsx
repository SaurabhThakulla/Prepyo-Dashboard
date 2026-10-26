import React, { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { logOut } from './api';
import { useInstitutionAccount } from './account';
import { dashboardPath, LOGIN_PATH, sectionPath } from './paths';
import { InstitutionLoading } from './InstitutionPage';
import InstitutionLayout, { InstitutionSection } from './InstitutionLayout';
import OverviewSection from './OverviewSection';
import SettingsSection from './SettingsSection';
import StudentsCard from './StudentsCard';
import StudentLoginPage from './StudentLoginPage';
import SetupPage from './SetupPage';

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

  // The dashboard opens only once the setup is finished.
  if (!institution.onboarded) return <SetupPage account={account} onSaved={setAccount} onSignOut={signOut} />;
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
      {page === 'students' && <StudentsCard code={institution.code} seatLimit={institution.seatLimit} exams={institution.profile.exams} />}
      {page === 'settings' && <SettingsSection account={account} onEdit={() => setEditing(true)} />}
    </InstitutionLayout>
  );
}
