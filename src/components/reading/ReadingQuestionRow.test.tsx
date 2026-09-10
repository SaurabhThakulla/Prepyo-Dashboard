import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { READING_TYPES } from '@/lib/readingTypes';
import { PracticeAttempt, Question } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';
import ReadingQuestionRow from './ReadingQuestionRow';

function gapFillQuestion(): Question {
  return {
    id: 'q-gaps',
    examVersionId: 'pte-2026-01',
    exam: 'PTE',
    skill: 'reading',
    typeId: READING_TYPES.fillBlanksRW,
    typeName: 'Reading & Writing: Fill in the Blanks',
    title: 'Time zones',
    prompt: 'Select the appropriate answer choice for each blank.',
    contextPassage: 'noon arrived several minutes [[b1]] noon in another, and nobody was [[b2]].',
    blanks: [
      { id: 'b1', options: ['behind', 'ahead'] },
      { id: 'b2', options: ['inconvenienced', 'delighted'] },
    ],
    timeLimitSeconds: 180,
    difficulty: 'medium',
    tags: [],
    points: 2,
  };
}

function result(attempt: Partial<PracticeAttempt>): ReadingAnswerResult {
  return {
    attempt: {
      id: 'a-1',
      questionId: 'q-gaps',
      examVersionId: 'pte-2026-01',
      isCorrect: false,
      score: 0,
      maxScore: 2,
      accuracyPercentage: 0,
      feedback: '',
      timeSpentSeconds: 10,
      createdAt: new Date().toISOString(),
      ...attempt,
    } as PracticeAttempt,
    review: gapFillQuestion(),
  };
}

// A learner who filled two of five gaps was shown the same red cross as one who
// filled none, and a set summary reading "0 of 1 correct".
describe('the verdict on a question with several parts', () => {
  it('reports the marks earned when some parts are right', () => {
    render(
      <ReadingQuestionRow
        question={gapFillQuestion()}
        number={1}
        result={result({ accuracyPercentage: 40, score: 0.8, feedback: 'You filled 2 of 5 blanks correctly.' })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('You filled 2 of 5 blanks correctly.')).toBeDefined();
  });

  it('says nothing about parts when the whole question is wrong', () => {
    render(
      <ReadingQuestionRow
        question={gapFillQuestion()}
        number={1}
        result={result({ accuracyPercentage: 0, feedback: 'You filled 0 of 5 blanks correctly.' })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByText('You filled 0 of 5 blanks correctly.')).toBeNull();
  });
});
