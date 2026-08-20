import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const plans = db.getPlans();
  return NextResponse.json({
    success: true,
    plans,
  });
}
