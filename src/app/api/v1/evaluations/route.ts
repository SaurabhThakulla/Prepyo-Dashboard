import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AIGateway } from '@/lib/ai-gateway';

export async function GET() {
  const logs = db.getAIEvaluationLogs();
  return NextResponse.json({ success: true, count: logs.length, evaluations: logs });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, questionId, exam, skill, typeId, prompt, userText, audioDurationSeconds } = body;

    let result;
    if (mode === 'speaking' || skill === 'speaking') {
      result = await AIGateway.evaluateSpeaking({
        questionId: questionId || 'custom-spk',
        exam: exam || 'PTE',
        skill: 'speaking',
        typeId: typeId || 'read-aloud',
        prompt: prompt || 'Speaking Practice Assessment',
        userText: userText || '',
        audioDurationSeconds: audioDurationSeconds || 35,
      });
    } else {
      result = await AIGateway.evaluateWriting({
        questionId: questionId || 'custom-wrt',
        exam: exam || 'PTE',
        skill: 'writing',
        typeId: typeId || 'write-essay',
        prompt: prompt || 'Writing Assessment',
        userText: userText || '',
        wordCount: (userText || '').trim().split(/\s+/).filter(Boolean).length,
      });
    }

    db.logAIEvaluation(result);
    return NextResponse.json({ success: true, evaluation: result, user: db.getUser() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
