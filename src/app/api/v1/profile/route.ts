import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const user = db.getUser();
  return NextResponse.json({ success: true, user });
}

export async function PUT(req: Request) {
  try {
    const updates = await req.json();
    const user = db.updateUser(updates);
    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
