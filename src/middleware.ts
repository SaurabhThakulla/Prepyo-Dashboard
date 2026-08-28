import { NextRequest, NextResponse } from 'next/server';

/**
 * Name must match auth.SessionCookieName in the Go backend.
 */
const SESSION_COOKIE = 'prepyo_session';

/** Routes that require a signed-in learner. */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/practice',
  '/mocks',
  '/mistakes',
  '/evaluations',
  '/leaderboard',
  '/profile',
  '/referrals',
  '/subscription',
  '/diagnostic',
  '/admin',
];

/**
 * Redirects signed-out visitors away from app pages before anything renders.
 *
 * This is a cookie *presence* check only — it cannot tell whether the session
 * is still valid, and it deliberately does not try. The backend is the only
 * thing that authenticates a request; this just avoids showing an app shell
 * that is about to bounce. RequireAuth on the client handles expired sessions.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    // Send them back where they were headed once they sign in.
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Someone with a session has no reason to see the sign-in form, and "/" is
  // that form now that the marketing page has moved to its own project.
  if (hasSession && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
    // RequireAuth sends learners here with expired=1 once the backend has
    // rejected the cookie. Presence is all this middleware can check, so on its
    // own it would bounce them back into the app and loop. The cookie is
    // HttpOnly, so the client cannot drop it either — clear it here, which is
    // the one place that can, and let the sign-in form render.
    if (request.nextUrl.searchParams.get('expired') === '1') {
      const response = NextResponse.next();
      response.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
      return response;
    }

    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip API routes (the backend guards those), Next internals and static files.
  matcher: ['/((?!api|_next/static|_next/image|images|favicon.ico).*)'],
};
