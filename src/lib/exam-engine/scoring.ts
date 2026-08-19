import { ExamType, SkillType, Question, UserAnswerSubmission } from '../types';

export interface ScoreEvaluation {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  accuracyPercentage: number;
  feedback: string;
  correctAnswersDisplay: string;
  userAnswersDisplay: string;
}

export class ExamScoringEngine {
  /**
   * Deterministically evaluate questions like Fill in Blanks, MCQs, True/False, Re-order, Dictation
   */
  static evaluateSubmission(question: Question, submission: UserAnswerSubmission): ScoreEvaluation {
    const maxScore = question.points || 10;
    let earned = 0;
    let feedback = '';
    let correctAnswersDisplay = '';
    let userAnswersDisplay = '';

    // 1. Reading & Writing Fill in the Blanks / IELTS Blanks
    if (question.blanks && submission.blankResponses) {
      let correctBlanks = 0;
      const totalBlanks = question.blanks.length;
      const userResps = submission.blankResponses;

      question.blanks.forEach(b => {
        const userVal = (userResps[b.id] || '').trim().toLowerCase();
        const correctVal = b.correctAnswer.trim().toLowerCase();
        if (userVal === correctVal) {
          correctBlanks += 1;
        }
      });

      earned = Math.round((correctBlanks / totalBlanks) * maxScore);
      correctAnswersDisplay = question.blanks.map(b => `${b.id}: ${b.correctAnswer}`).join(', ');
      userAnswersDisplay = question.blanks.map(b => `${b.id}: ${userResps[b.id] || '(empty)'}`).join(', ');
      feedback = `You got ${correctBlanks} out of ${totalBlanks} blanks correct.`;
      
      return {
        isCorrect: correctBlanks === totalBlanks,
        score: earned,
        maxScore,
        accuracyPercentage: Math.round((correctBlanks / totalBlanks) * 100),
        feedback,
        correctAnswersDisplay,
        userAnswersDisplay,
      };
    }

    // 2. Re-order Paragraphs
    if (question.typeId === 'reorder-paragraphs' && Array.isArray(question.correctAnswers)) {
      const correctSeq = question.correctAnswers;
      const userSeq = submission.selectedOptions || [];
      
      // PTE Reorder scores based on correct adjacent pairs
      let correctPairs = 0;
      const totalPairs = Math.max(1, correctSeq.length - 1);

      for (let i = 0; i < correctSeq.length - 1; i++) {
        const p1 = correctSeq[i];
        const p2 = correctSeq[i + 1];
        const userIdx1 = userSeq.indexOf(p1);
        const userIdx2 = userSeq.indexOf(p2);
        if (userIdx1 !== -1 && userIdx2 !== -1 && userIdx2 === userIdx1 + 1) {
          correctPairs += 1;
        }
      }

      earned = Math.round((correctPairs / totalPairs) * maxScore);
      return {
        isCorrect: correctPairs === totalPairs,
        score: earned,
        maxScore,
        accuracyPercentage: Math.round((correctPairs / totalPairs) * 100),
        feedback: `You matched ${correctPairs} out of ${totalPairs} adjacent paragraph pairs correctly.`,
        correctAnswersDisplay: correctSeq.join(' ➔ '),
        userAnswersDisplay: userSeq.join(' ➔ ') || '(none)',
      };
    }

    // 3. True / False / Not Given (IELTS)
    if (question.typeId === 'ielts-reading-tfng' && Array.isArray(question.correctAnswers)) {
      const correctArr = question.correctAnswers;
      const userArr = submission.selectedOptions || [];
      let correctCount = 0;

      correctArr.forEach((c, idx) => {
        if (userArr[idx] && userArr[idx].toUpperCase() === c.toUpperCase()) {
          correctCount += 1;
        }
      });

      earned = Math.round((correctCount / correctArr.length) * maxScore);
      return {
        isCorrect: correctCount === correctArr.length,
        score: earned,
        maxScore,
        accuracyPercentage: Math.round((correctCount / correctArr.length) * 100),
        feedback: `You got ${correctCount} of ${correctArr.length} statements correct.`,
        correctAnswersDisplay: correctArr.join(', '),
        userAnswersDisplay: userArr.join(', ') || '(unanswered)',
      };
    }

    // 4. Write from Dictation (PTE)
    if (question.typeId === 'write-from-dictation' && typeof question.correctAnswers === 'string') {
      const targetWords = question.correctAnswers.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').split(/\s+/);
      const userWords = (submission.textResponse || '').toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').split(/\s+/);
      
      let matchedWords = 0;
      targetWords.forEach(w => {
        if (userWords.includes(w)) matchedWords += 1;
      });

      earned = Math.round((matchedWords / targetWords.length) * maxScore);
      return {
        isCorrect: matchedWords >= targetWords.length,
        score: earned,
        maxScore,
        accuracyPercentage: Math.round((matchedWords / targetWords.length) * 100),
        feedback: `You matched ${matchedWords} of ${targetWords.length} words correctly in dictation.`,
        correctAnswersDisplay: question.correctAnswers,
        userAnswersDisplay: submission.textResponse || '(empty)',
      };
    }

    // Default Fallback
    return {
      isCorrect: true,
      score: maxScore,
      maxScore,
      accuracyPercentage: 100,
      feedback: 'Completed successfully.',
      correctAnswersDisplay: 'N/A',
      userAnswersDisplay: submission.textResponse || 'Submitted',
    };
  }

  /**
   * Convert PTE raw points (10-90) and IELTS raw points (0-9 Band)
   */
  static calculateTargetGap(exam: ExamType, targetScore: number, currentEstimate: number): { gap: number; formattedText: string; isTargetMet: boolean } {
    const gap = Math.max(0, targetScore - currentEstimate);
    const isTargetMet = currentEstimate >= targetScore;
    
    if (exam === 'PTE') {
      return {
        gap,
        formattedText: isTargetMet ? 'Target Met (79+ Ready!)' : `${gap} points to target`,
        isTargetMet,
      };
    } else {
      const bandGap = Math.max(0, Math.round((targetScore - currentEstimate) * 2) / 2);
      return {
        gap: bandGap,
        formattedText: isTargetMet ? 'Target Band Achieved!' : `${bandGap} Band to target`,
        isTargetMet,
      };
    }
  }
}
