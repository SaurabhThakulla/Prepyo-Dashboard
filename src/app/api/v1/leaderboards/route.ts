import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ExamType } from '@/lib/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const exam = (searchParams.get('exam') as ExamType) || undefined;
  const region = searchParams.get('region') || undefined;

  const leaderboard = db.getLeaderboard(exam, region);
  const currentUser = db.getUser();

  return NextResponse.json({
    success: true,
    count: leaderboard.length,
    leaderboard,
    userRank: leaderboard.find(u => u.name === currentUser.name)?.rank || 4,
    regions: ['all', 'Kathmandu', 'Pokhara', 'Chitwan', 'Lalitpur', 'Butwal', 'Dharan'],
  });
}
