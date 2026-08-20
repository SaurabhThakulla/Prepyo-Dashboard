import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isPaidTier } from '@/lib/subscriptions';

export async function POST(req: Request) {
  try {
    const { planId, paymentGateway } = await req.json();

    if (!isPaidTier(planId)) {
      return NextResponse.json({ success: false, error: 'Invalid plan selected' }, { status: 400 });
    }

    // Bonus days live on the plan, so they stay correct if pricing changes.
    const plan = db.getPlans().find(p => p.id === planId);
    const bonusDays = plan?.bonusDays || 0;

    const updatedUser = db.upgradeSubscription(planId);
    return NextResponse.json({
      success: true,
      message: `Payment successful via ${paymentGateway || 'eSewa'}! Activated ${planId.toUpperCase()} with +${bonusDays} bonus days.`,
      user: updatedUser,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
