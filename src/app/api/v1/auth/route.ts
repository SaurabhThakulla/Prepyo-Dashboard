import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const user = db.getUser();
  return NextResponse.json({ success: true, user });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, name, targetExam, targetScore, nepalRegion } = body;

    if (action === 'demo-login') {
      const user = db.getUser();
      return NextResponse.json({ success: true, user, message: 'Logged in as Demo Student' });
    }

    if (action === 'social-login' || action === 'google' || action === 'apple' || action === 'facebook') {
      const provider = body.provider || action;
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      const socialEmail = email || `student.${provider}@prepyo.np`;
      const socialName = name || (provider === 'google' ? 'Google Student' : provider === 'apple' ? 'Apple Student' : 'Facebook Student');
      
      const updated = db.updateUser({
        email: socialEmail,
        name: socialName,
      });
      return NextResponse.json({
        success: true,
        user: updated,
        message: `Successfully authenticated with ${providerName}`,
      });
    }

    if (action === 'login') {
      let user = db.getUser();
      if (email && email.trim() !== '') {
        user = db.updateUser({ email });
      }
      return NextResponse.json({ success: true, user, message: 'Logged in successfully' });
    }

    if (action === 'register' || action === 'signup') {
      const updated = db.updateUser({
        email: email || 'learner@prepyo.np',
        name: name || 'Student',
      });
      db.awardXP(100, 'Completed Registration');
      return NextResponse.json({ success: true, user: updated, message: 'Account created successfully! +100 XP awarded.' });
    }

    const user = db.getUser();
    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
