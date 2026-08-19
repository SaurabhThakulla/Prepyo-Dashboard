import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ExamType, SkillType } from '@/lib/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const exam = (searchParams.get('exam') as ExamType) || undefined;
  const skill = (searchParams.get('skill') as SkillType) || undefined;
  const tag = searchParams.get('tag') || undefined;
  const unresolvedOnly = searchParams.get('unresolved') === 'true';

  const mistakes = db.getMistakes({ exam, skill, tag, unresolvedOnly });
  return NextResponse.json({ success: true, count: mistakes.length, mistakes });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, id, mistake } = body;

    if (action === 'resolve' && id) {
      const ok = db.resolveMistake(id);
      return NextResponse.json({ success: ok, user: db.getUser(), message: 'Mistake marked as resolved! +30 XP' });
    }

    if (mistake) {
      const created = db.addMistake(mistake);
      return NextResponse.json({ success: true, mistake: created });
    }

    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
