import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ExamType, MockAttemptResult, SkillType } from '@/lib/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const exam = (searchParams.get('exam') as ExamType) || undefined;
  const mocks = db.getMocks(exam);
  const pastAttempts = db.getMockAttempts();
  return NextResponse.json({ success: true, mocks, pastAttempts });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mockId, answers, durationSeconds } = body;
    const blueprint = db.getMockById(mockId);

    if (!blueprint) {
      return NextResponse.json({ success: false, error: 'Mock Blueprint not found' }, { status: 404 });
    }

    const isPTE = blueprint.exam === 'PTE';
    const estimatedOverall = isPTE ? Math.floor(Math.random() * 12) + 72 : Math.round((Math.random() * 1.5 + 6.5) * 2) / 2;

    const skillScores: Record<SkillType, number> = isPTE ? {
      speaking: Math.floor(Math.random() * 10) + 75,
      writing: Math.floor(Math.random() * 10) + 72,
      reading: Math.floor(Math.random() * 10) + 70,
      listening: Math.floor(Math.random() * 10) + 74,
    } : {
      speaking: 7.5,
      writing: 7.0,
      reading: 7.5,
      listening: 8.0,
    };

    const attemptResult: MockAttemptResult = {
      id: `attempt-${Date.now()}`,
      mockId: blueprint.id,
      exam: blueprint.exam,
      userScore: estimatedOverall,
      skillScores,
      enablingSkills: isPTE ? {
        grammar: 76,
        vocabulary: 78,
        fluency: 82,
        pronunciation: 80,
        coherence: 75,
      } : undefined,
      totalCorrect: Math.floor(blueprint.totalQuestions * 0.8),
      totalQuestions: blueprint.totalQuestions,
      durationSeconds: durationSeconds || blueprint.totalDurationMinutes * 60,
      targetGap: Math.max(0, (isPTE ? 79 : 7.5) - estimatedOverall),
      readinessImpact: 6,
      completedAt: new Date().toISOString(),
      sectionBreakdowns: blueprint.sections.map(sec => ({
        sectionName: sec.name,
        skill: sec.skill,
        score: isPTE ? 74 : 7.5,
        maxScore: isPTE ? 90 : 9.0,
      })),
    };

    const saved = db.saveMockAttempt(attemptResult);
    return NextResponse.json({ success: true, attempt: saved, user: db.getUser() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
