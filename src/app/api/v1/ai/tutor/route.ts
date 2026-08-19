import { NextResponse } from 'next/server';
import { AIGateway } from '@/lib/ai-gateway';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { messages, contextPrompt, exam } = await req.json();
    const activeExam = exam || db.getUser().targetExam;
    const reply = await AIGateway.chatWithTutor(messages || [], contextPrompt, activeExam);
    return NextResponse.json({ success: true, reply });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
