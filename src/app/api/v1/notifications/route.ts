import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const notifications = db.getNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;
  return NextResponse.json({ success: true, count: notifications.length, unreadCount, notifications });
}

export async function POST(req: Request) {
  try {
    const { action, id } = await req.json();
    if (action === 'mark-read' && id) {
      db.markNotificationRead(id);
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
