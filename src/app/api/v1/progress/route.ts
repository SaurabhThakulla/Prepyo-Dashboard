import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ExamScoringEngine } from '@/lib/exam-engine/scoring';

export async function GET() {
  const user = db.getUser();
  const isPTE = user.targetExam === 'PTE';

  const skillBreakdown = [
    { skill: 'speaking', name: 'Speaking', estimate: isPTE ? 76 : 7.5, target: user.targetScore, accuracy: 82, status: 'strong', questionsDone: 42 },
    { skill: 'writing', name: 'Writing', estimate: isPTE ? 68 : 6.5, target: user.targetScore, accuracy: 71, status: 'weak', questionsDone: 28 },
    { skill: 'reading', name: 'Reading', estimate: isPTE ? 72 : 7.0, target: user.targetScore, accuracy: 78, status: 'moderate', questionsDone: 56 },
    { skill: 'listening', name: 'Listening', estimate: isPTE ? 75 : 7.5, target: user.targetScore, accuracy: 84, status: 'strong', questionsDone: 39 },
  ];

  const targetGapInfo = ExamScoringEngine.calculateTargetGap(user.targetExam, user.targetScore, user.estimatedScore);

  const weakSkillAnalysis = {
    weakestSkill: 'writing',
    weakestSkillName: 'Writing & Summaries',
    issueSummary: isPTE ? 'PTE Summarize Written Text length constraints and complex sentence structure.' : 'IELTS Writing Task 2 Lexical Range & Paragraph coherence.',
    recommendedActions: [
      'Practice 2 Summarize Written Text tasks focusing on single-sentence compound clauses.',
      'Review Mistake Bank: 3 grammar/collocation errors pending review.',
      'Take a 15-minute Writing sectional mock.'
    ]
  };

  return NextResponse.json({
    success: true,
    user,
    skillBreakdown,
    targetGapInfo,
    weakSkillAnalysis,
    readinessScore: user.readinessPercentage,
    totalPracticeMinutes: 340,
    totalQuestionsCompleted: 165,
  });
}
