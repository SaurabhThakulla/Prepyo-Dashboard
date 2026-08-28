import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

/**
 * Receives an issue report from the in-app dialog and emails it.
 *
 * This lives on the Next side rather than behind /api/v1 because it is the one
 * thing in the product that sends mail and it needs nothing from the database.
 * next.config.js only proxies /api/v1/*, so this path stays local.
 */

// nodemailer needs Node APIs, so this route cannot run on the edge runtime.
export const runtime = 'nodejs';

/** Must match auth.SessionCookieName in the Go backend. */
const SESSION_COOKIE = 'prepyo_session';

const BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const REPORT_TO = process.env.REPORT_EMAIL_TO || 'sauravthakulla683@gmail.com';

/** Long enough for a real report, short enough that nobody can post a book. */
const MAX_MESSAGE = 4000;

/** Per IP, per window: room for a frustrated learner, not for a spammer. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
/** Cap on tracked IPs, so a flood of distinct addresses cannot grow this map
 *  without bound on a long-lived server. */
const MAX_TRACKED_IPS = 5000;

const recentReports = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  if (recentReports.size > MAX_TRACKED_IPS) {
    for (const [key, times] of recentReports) {
      if (times.every(t => now - t >= RATE_WINDOW_MS)) recentReports.delete(key);
    }
  }

  const hits = (recentReports.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  hits.push(now);
  recentReports.set(ip, hits);
  return hits.length > RATE_LIMIT;
}

/**
 * Confirms the session is real and returns who is reporting.
 *
 * The cookie is opaque here, so the backend is asked. That also means a report
 * always carries a verified name and address rather than whatever the browser
 * claimed.
 */
async function resolveReporter(
  sessionValue: string,
): Promise<{ name: string; email: string } | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/profile`, {
      headers: { cookie: `${SESSION_COOKIE}=${sessionValue}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const body = await res.json();
    const user = body?.user;
    if (!user?.email) return null;

    return { name: String(user.name ?? 'Learner'), email: String(user.email) };
  } catch {
    // The backend being unreachable is not something the reporter can act on,
    // and it must not look like a successful send.
    return null;
  }
}

export async function POST(request: NextRequest) {
  const sessionValue = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionValue) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

  let message: string;
  let path: string;
  try {
    const body = await request.json();
    message = typeof body?.message === 'string' ? body.message.trim() : '';
    path = typeof body?.path === 'string' ? body.path.slice(0, 200) : 'unknown';
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE) {
    message = message.slice(0, MAX_MESSAGE);
  }

  const reporter = await resolveReporter(sessionValue);
  if (!reporter) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPassword) {
    // Deliberately not a 200: a learner who typed out a bug deserves to know it
    // did not go anywhere.
    console.error('Issue report dropped: GMAIL_USER / GMAIL_APP_PASSWORD are not set.');
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }

  try {
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPassword },
    });

    await transport.sendMail({
      from: `Prepyo Reports <${gmailUser}>`,
      to: REPORT_TO,
      // Replying in the mail client goes straight back to the learner.
      replyTo: reporter.email,
      subject: `Prepyo issue report from ${reporter.name}`,
      text: [
        `From: ${reporter.name} <${reporter.email}>`,
        `Page: ${path}`,
        `Time: ${new Date().toISOString()}`,
        '',
        message,
      ].join('\n'),
    });
  } catch (err) {
    console.error('Failed to send issue report:', err);
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
