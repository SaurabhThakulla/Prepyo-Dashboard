/**
 * Sample data for working on the UI without a backend.
 *
 * WHY THIS EXISTS
 * ---------------
 * You often want to build a page before its API endpoint is ready, or without
 * logging in. Rather than each page inventing its own fallback inside a
 * `.catch()` — which hides real API failures — fixtures live here and are
 * OPT-IN via an environment variable.
 *
 * HOW TO USE IT
 * -------------
 * Add this to `.env.local` and restart the dev server:
 *
 *     NEXT_PUBLIC_USE_FIXTURES=true
 *
 * With the flag off (the default, and always in production), pages fetch real
 * data and show real errors.
 *
 * THE RULE
 * --------
 * Fixtures seed the FIRST render only. A page must still call the API, still
 * show its loading state, and still report errors. Fixtures are never a
 * substitute for error handling.
 *
 * Money is deliberately excluded: subscription prices and quotas have no
 * fixture, because showing a price we might not charge is worse than showing
 * an error. See src/app/subscription/page.tsx.
 */

import {
  Evaluation,
  ExamType,
  LeaderboardEntry,
  Mistake,
  Mock,
  Question,
  SkillType,
} from '@/lib/types';

import aiEvaluationsData from '@/data/ai-evaluations.json';
import diagnosticTestData from '@/data/diagnostic-test.json';
import leaderboardRankingsData from '@/data/leaderboard-rankings.json';
import mistakesBankData from '@/data/mistakes-bank.json';
import mockTestsData from '@/data/mock-tests.json';

/** True only when you have explicitly opted in via .env.local. */
export const USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURES === 'true';

// ---------------------------------------------------------------------------
// Helpers
//
// The JSON files were written to read like the screen designs, so their field
// names do not match our domain types. These helpers do the translation in one
// place. If a JSON file changes shape, TypeScript fails HERE rather than
// silently rendering wrong data in a page.
// ---------------------------------------------------------------------------

/** JSON writes skills as "Reading"; the app uses 'reading'. */
function toSkill(value: string): SkillType {
  const normalised = value.trim().toLowerCase();
  if (normalised.includes('speaking')) return 'speaking';
  if (normalised.includes('writing')) return 'writing';
  if (normalised.includes('reading')) return 'reading';
  return 'listening';
}

function toExam(value: string): ExamType {
  return value.trim().toUpperCase() === 'PTE' ? 'PTE' : 'IELTS';
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * The mock catalog, with the diagnostic first.
 *
 * The real GET /mocks returns the diagnostic alongside the rest — the
 * diagnostic page finds it with `mocks.find(m => m.isDiagnostic)` rather than
 * calling a separate endpoint. The fixture has to include it too, or that page
 * shows "no diagnostic available" in fixture mode.
 */
export function fixtureMocks(exam: ExamType): Mock[] {
  const catalog: Mock[] = mockTestsData.availableMockTests.map(mock => ({
    id: mock.id,
    examVersionId: 'v1',
    exam: toExam(mock.exam),
    title: mock.title,
    description: mock.description,
    totalDurationMinutes: mock.durationMinutes,
    totalQuestions: mock.totalQuestions,
    isDiagnostic: false,
    sections: mock.sections.map((section, index) => ({
      id: `sec-${mock.id}-${index}`,
      name: section.name,
      skill: toSkill(section.name),
      durationMinutes: section.durationMinutes,
      questionIds: Array.from(
        { length: section.questions },
        (_, questionIndex) => `q-${mock.id}-${index}-${questionIndex}`,
      ),
    })),
  }));

  return [fixtureDiagnostic(exam), ...catalog];
}

function fixtureDiagnostic(exam: ExamType): Mock {
  return {
    id: 'diagnostic-01',
    examVersionId: 'v1',
    exam,
    title: `${exam} 15-Minute Baseline Diagnostic Test`,
    description: diagnosticTestData.description,
    totalDurationMinutes: diagnosticTestData.totalDurationMinutes,
    totalQuestions: diagnosticTestData.questionCount,
    isDiagnostic: true,
    sections: diagnosticTestData.sections.map((section, index) => ({
      id: `diag-sec-${index}`,
      name: section.sectionName,
      skill: toSkill(section.sectionName),
      durationMinutes: section.timeLimitMinutes,
      questionIds: [`q-${index}-1`, `q-${index}-2`],
    })),
  };
}

export function fixtureMistakes(): Mistake[] {
  return mistakesBankData.mistakes.map(mistake => ({
    id: mistake.id,
    questionId: mistake.id,
    questionTitle: mistake.questionTitle,
    exam: toExam(mistake.exam),
    skill: toSkill(mistake.skill),
    typeName: mistake.taskType,
    prompt: mistake.questionTitle,
    userResponse: mistake.yourAnswer,
    correctResponse: mistake.correctAnswer,
    explanation: mistake.whyItWasWrong,
    errorTag: 'Concept',
    failedCount: 1,
    resolved: mistake.isResolved,
    lastAttemptedAt: mistake.savedAt,
  }));
}

export function fixtureLeaderboard(exam: ExamType): LeaderboardEntry[] {
  return leaderboardRankingsData.topStudents.map(student => ({
    rank: student.rank,
    userId: `user-${student.rank}`,
    name: student.name,
    nepalRegion: student.district,
    exam,
    xp: student.weeklyXp,
    level: Math.floor(student.weeklyXp / 400) + 1,
    streakDays: student.streakDays,
    isYou: student.isCurrentUser,
  }));
}

/** Districts shown in the leaderboard filter, derived from the entries above. */
export function fixtureLeaderboardRegions(): string[] {
  const districts = leaderboardRankingsData.topStudents.map(s => s.district);
  return ['all', ...Array.from(new Set(districts))];
}

export function fixtureEvaluations(): Evaluation[] {
  return aiEvaluationsData.writingEvaluations.map(evaluation => ({
    id: evaluation.evaluationId,
    questionId: 'q-wri-001',
    exam: toExam(evaluation.exam),
    skill: 'writing',
    evaluationVersion: 'v1',
    estimatedScore: evaluation.overallBandScore,
    scoreConfidence: 'high',
    summary: [...evaluation.strengths, ...evaluation.areasToImprove].join('. '),
    criteria: [
      { name: 'Task Achievement', score: evaluation.rubricScores.taskAchievement, maxScore: 9, feedback: 'Well structured response' },
      { name: 'Coherence & Cohesion', score: evaluation.rubricScores.coherenceAndCohesion, maxScore: 9, feedback: 'Smooth transitions between paragraphs' },
      { name: 'Lexical Resource', score: evaluation.rubricScores.lexicalResource, maxScore: 9, feedback: 'Good range of words' },
      { name: 'Grammatical Accuracy', score: evaluation.rubricScores.grammaticalAccuracy, maxScore: 9, feedback: 'Minor article omissions' },
    ],
    strengths: evaluation.strengths,
    weaknesses: evaluation.areasToImprove,
    sentenceFeedback: [],
    modelRewrite: evaluation.aiTutorTip,
    createdAt: '2026-08-25',
  }));
}

/** One writing task, so the evaluations page has something to submit against. */
export function fixtureWritingQuestions(exam: ExamType): Question[] {
  return [
    {
      id: 'q-wri-001',
      examVersionId: 'v1',
      exam,
      skill: 'writing',
      typeId: 'write-essay',
      typeName: 'Write Essay',
      title: aiEvaluationsData.writingEvaluations[0].questionTitle,
      prompt:
        'Some people believe that online learning is better than traditional classrooms. Do you agree or disagree?',
      difficulty: 'medium',
      timeLimitSeconds: 2400,
      tags: ['essay', 'opinion'],
      points: 100,
    },
  ];
}
