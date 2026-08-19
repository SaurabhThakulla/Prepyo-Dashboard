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

    if (action === 'register' || action === 'signup') {
      const updated = db.updateUser({
        email: email || 'learner@prepyo.np',
        name: name || 'Student',
        targetExam: targetExam || 'PTE',
        targetScore: targetScore || (targetExam === 'IELTS' ? 7.5 : 79),
        nepalRegion: nepalRegion || 'Kathmandu',
      });
      db.awardXP(100, 'Completed Registration & Goal Setup');
      return NextResponse.json({ success: true, user: updated, message: 'Account created successfully!' });
    }

    const user = db.getUser();
    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
