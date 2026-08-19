import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const user = db.getUser();
  const missions = db.getDailyMissions();
  return NextResponse.json({
    success: true,
    user: {
      xp: user.xp,
      level: user.level,
      streakDays: user.streakDays,
      streakFrozen: user.streakFrozen,
      streakLastActiveDate: user.streakLastActiveDate,
    },
    dailyMissions: missions,
    xpToNextLevel: (user.level * 400) - user.xp,
  });
}

export async function POST(req: Request) {
  try {
    const { action, missionId } = await req.json();
    if (action === 'complete-mission' && missionId) {
      const updatedMission = db.completeDailyMission(missionId);
      return NextResponse.json({ success: true, mission: updatedMission, user: db.getUser() });
    }

    if (action === 'freeze-streak') {
      const updated = db.updateUser({ streakFrozen: true });
      return NextResponse.json({ success: true, user: updated, message: 'Streak Freeze activated for 24 hours!' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
