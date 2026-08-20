import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { planId, paymentGateway } = await req.json();

    if (planId !== 'weekly' && planId !== 'pro' && planId !== 'elite') {
      return NextResponse.json({ success: false, error: 'Invalid plan selected' }, { status: 400 });
    }

    const bonusMap: Record<string, number> = {
      weekly: 0,
      pro: 3,
      elite: 7,
    };
    const bonusDays = bonusMap[planId] || 0;

    const updatedUser = db.upgradeSubscription(planId as any);
    return NextResponse.json({
      success: true,
      message: `Payment successful via ${paymentGateway || 'eSewa'}! Activated ${planId.toUpperCase()} with +${bonusDays} bonus days.`,
      user: updatedUser,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
