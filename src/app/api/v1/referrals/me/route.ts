import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const user = db.getUser();
  const referralCode = user.referralCode || 'PREP-7X9K2M';

  return NextResponse.json({
    success: true,
    referralCode: referralCode,
    shareLink: `https://prepyo.com/signup?ref=${referralCode}`,
    stats: {
      totalInvited: 4,
      pending: 1,
      completed: 3,
      totalXpEarned: 600,
    },
    milestones: {
      threeReferrals: {
        required: 3,
        current: 3,
        completed: true,
      },
      fiveReferrals: {
        required: 5,
        current: 3,
        completed: false,
      },
    },
    recentReferrals: [
      {
        id: '1',
        friendName: 'R*** S***',
        status: 'completed',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        completedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '2',
        friendName: 'A*** B***',
        status: 'completed',
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        completedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: '3',
        friendName: 'P*** T***',
        status: 'completed',
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        completedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      },
      {
        id: '4',
        friendName: 'S*** K***',
        status: 'pending',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
    ],
  });
}
