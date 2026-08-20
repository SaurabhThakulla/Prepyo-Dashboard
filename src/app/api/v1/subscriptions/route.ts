import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isPaidTier } from '@/lib/subscriptions';

export async function GET() {
  const plans = db.getPlans();
  const user = db.getUser();
  return NextResponse.json({
    success: true,
    plans,
    currentTier: user.subscriptionTier,
    validUntil: user.subscriptionValidUntil,
    dailyEvaluationsUsed: user.dailyEvaluationsUsed,
    dailyEvaluationsLimit: user.dailyEvaluationsLimit,
  });
}

export async function POST(req: Request) {
  try {
    const { planId, paymentGateway } = await req.json();

    if (!isPaidTier(planId)) {
      return NextResponse.json({ success: false, error: 'Invalid plan selected' }, { status: 400 });
    }

    // Mock payment verification simulation (eSewa / Khalti / Fonepay)
    const updatedUser = db.upgradeSubscription(planId);
    return NextResponse.json({
      success: true,
      message: `Payment successful via ${paymentGateway || 'eSewa'}! Subscription upgraded to ${planId.toUpperCase()}.`,
      user: updatedUser,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
