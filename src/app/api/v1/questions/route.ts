import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ExamType, SkillType } from '@/lib/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const exam = (searchParams.get('exam') as ExamType) || undefined;
  const skill = (searchParams.get('skill') as SkillType) || undefined;
  const typeId = searchParams.get('typeId') || undefined;
  const difficulty = searchParams.get('difficulty') || undefined;
  const id = searchParams.get('id');

  if (id) {
    const q = db.getQuestionById(id);
    if (!q) return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
    return NextResponse.json({ success: true, question: q });
  }

  const questions = db.getQuestions({ exam, skill, typeId, difficulty });
  return NextResponse.json({ success: true, count: questions.length, questions });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = db.addQuestion(body);
    return NextResponse.json({ success: true, question: created });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
