import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code')?.toUpperCase() || '';

  if (!code || !code.startsWith('PREP-')) {
    return NextResponse.json({
      success: false,
      valid: false,
      message: 'Invalid referral code format.',
    });
  }

  return NextResponse.json({
    success: true,
    valid: true,
    referrerName: 'A*** R***',
    message: "Valid referral from a Prepyo learner. You'll receive +100 XP upon completing your first activity!",
  });
}
