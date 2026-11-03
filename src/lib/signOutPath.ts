import type { UserProfile } from '@/lib/types';

/**
 * Where someone lands once signed out. A consultancy's student goes back to
 * the consultancy's own sign-in page, never Prepyo's.
 *
 * The code is also remembered for a session that ends on its own (expired
 * cookie), when the user is already gone. It is only a convenience: losing it
 * sends the student to /login, which still works.
 */
const KEY = 'prepyo-institution-code';

export function rememberInstitution(user: UserProfile): void {
  try {
    if (user.institution?.code) localStorage.setItem(KEY, user.institution.code);
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the fallback is /login.
  }
}

function rememberedCode(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** The page to show after signing out. With no user (expired session) it uses the remembered consultancy. */
export function signedOutPath(user?: UserProfile | null): string {
  const code = user ? user.institution?.code : rememberedCode();
  return code ? `/${encodeURIComponent(code)}` : '/login';
}
