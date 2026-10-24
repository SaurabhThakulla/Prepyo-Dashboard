// The institution pages' addresses, in one place.
export const LOGIN_PATH = '/institution/login';
export const SIGNUP_PATH = '/institution/signup';

// Institutions register by email, not a form: this opens a mail to us with the details we need.
const REGISTER_BODY = [
  'Hello Prepyo team,',
  '',
  'We would like to register our institution on Prepyo.',
  '',
  'Institution name: ',
  'Contact person: ',
  'Email: ',
  'Phone: ',
  'City / address: ',
  'Exams we teach (PTE / IELTS / EPS-TOPIK): ',
  'Number of branches: ',
  'Students per month (approx.): ',
  '',
  'Thank you.',
].join('\n');
export const REGISTER_MAILTO =
  `mailto:contact@prepyo.online?subject=${encodeURIComponent('Institution registration')}&body=${encodeURIComponent(REGISTER_BODY)}`;

/** An institution's own address is just its name: /bright-future. Admin and students both use it. */
export const dashboardPath = (code: string) => `/${encodeURIComponent(code)}`;

/** A page of the admin's dashboard: /bright-future, /bright-future/students, /bright-future/settings. */
export const sectionPath = (code: string, section: string) =>
  section === 'overview' ? dashboardPath(code) : `${dashboardPath(code)}/${section}`;

// The first word of every address the app itself uses. Keep in step with App.tsx,
// and with reservedCodes in the backend's internal/institution/signup.go.
const APP_PAGES = new Set([
  'login', 'signup', 'home', 'dashboard', 'practice', 'me', 'mocks', 'mistakes', 'history', 'evaluations',
  'profile', 'referrals', 'subscription', 'diagnostic', 'tutorials', 'videos', 'learn',
  'reports', 'admin', 'terms', 'privacy', 'terms-and-conditions', 'privacy-policy', 'account', 'progress',
]);

/** True for /institution/... and for an institution's own address such as /bright-future. */
export function isInstitutionPath(pathname: string): boolean {
  const firstWord = pathname.split('/')[1] ?? '';
  return firstWord !== '' && !APP_PAGES.has(firstWord);
}
