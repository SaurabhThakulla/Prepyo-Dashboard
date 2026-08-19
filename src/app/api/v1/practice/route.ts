import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ExamScoringEngine } from '@/lib/exam-engine/scoring';
import { AIGateway } from '@/lib/ai-gateway';
import { UserAnswerSubmission } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const submission: UserAnswerSubmission = await req.json();
    const question = db.getQuestionById(submission.questionId);

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
    }

    let evaluationResult: any;
    let aiEvaluation: any = null;

    if (question.skill === 'writing') {
      aiEvaluation = await AIGateway.evaluateWriting({
        questionId: question.id,
        exam: question.exam,
        skill: 'writing',
        typeId: question.typeId,
        prompt: question.prompt,
        userText: submission.textResponse || '',
        wordCount: (submission.textResponse || '').trim().split(/\s+/).length,
      });
      db.logAIEvaluation(aiEvaluation);

      evaluationResult = {
        isCorrect: true,
        score: aiEvaluation.estimatedScore,
        maxScore: question.exam === 'PTE' ? 90 : 9,
        accuracyPercentage: question.exam === 'PTE' ? Math.round((aiEvaluation.estimatedScore / 90) * 100) : Math.round((aiEvaluation.estimatedScore / 9) * 100),
        feedback: aiEvaluation.summary,
        correctAnswersDisplay: question.modelAnswer || 'Refer to model answer in review',
        userAnswersDisplay: submission.textResponse || '',
      };
    } else if (question.skill === 'speaking') {
      aiEvaluation = await AIGateway.evaluateSpeaking({
        questionId: question.id,
        exam: question.exam,
        skill: 'speaking',
        typeId: question.typeId,
        prompt: question.prompt,
        userText: submission.textResponse || question.prompt,
        audioDurationSeconds: submission.audioDurationSeconds || 30,
      });
      db.logAIEvaluation(aiEvaluation);

      evaluationResult = {
        isCorrect: true,
        score: aiEvaluation.estimatedScore,
        maxScore: question.exam === 'PTE' ? 90 : 9,
        accuracyPercentage: question.exam === 'PTE' ? Math.round((aiEvaluation.estimatedScore / 90) * 100) : Math.round((aiEvaluation.estimatedScore / 9) * 100),
        feedback: aiEvaluation.summary,
        correctAnswersDisplay: question.modelAnswer || 'Refer to pronunciation guide',
        userAnswersDisplay: submission.textResponse || 'Spoken Recording Submitted',
      };
    } else {
      // Deterministic question evaluation (Reading / Listening)
      evaluationResult = ExamScoringEngine.evaluateSubmission(question, submission);

      if (!evaluationResult.isCorrect) {
        db.addMistake({
          questionId: question.id,
          questionTitle: question.title,
          exam: question.exam,
          skill: question.skill,
          typeName: question.typeName,
          prompt: question.prompt,
          userResponse: evaluationResult.userAnswersDisplay,
          correctResponse: evaluationResult.correctAnswersDisplay,
          explanation: question.explanation || 'Review question rules and collocations.',
          errorTag: question.skill === 'reading' ? 'Vocabulary' : 'Time Pressure',
          failedCount: 1,
          resolved: false,
        });
      }
    }

    // Award XP
    const xpReward = evaluationResult.isCorrect ? (question.points || 15) * 5 : 20;
    const { user, transaction } = db.awardXP(xpReward, `Completed Practice: ${question.typeName}`);

    return NextResponse.json({
      success: true,
      evaluation: evaluationResult,
      aiEvaluation,
      xpAwarded: xpReward,
      user,
      transaction,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
