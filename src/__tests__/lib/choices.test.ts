import { describe, it, expect } from 'vitest';
import { allowsMultipleChoices } from '@/lib/choices';

describe('allowsMultipleChoices', () => {
  it('identifies single choice questions accurately as false', () => {
    expect(allowsMultipleChoices({ typeId: 'reading-mcq-single' })).toBe(false);
    expect(allowsMultipleChoices({ typeId: 'pte-listening-mcsa' })).toBe(false);
    expect(allowsMultipleChoices({ typeId: 'ielts-listening-mcq-single' })).toBe(false);
    expect(allowsMultipleChoices({ typeId: 'multiple-choice-single' })).toBe(false);
    expect(allowsMultipleChoices({ typeId: 'random-single', typeName: 'MCQ Single Answer' })).toBe(false);
  });

  it('identifies multiple choice questions accurately as true', () => {
    expect(allowsMultipleChoices({ typeId: 'reading-mcq-multiple' })).toBe(true);
    expect(allowsMultipleChoices({ typeId: 'pte-listening-mcma' })).toBe(true);
    expect(allowsMultipleChoices({ typeId: 'ielts-listening-mcq-multiple' })).toBe(true);
    expect(allowsMultipleChoices({ typeId: 'multiple-choice-multiple' })).toBe(true);
    expect(allowsMultipleChoices({ typeId: 'custom-task', typeName: 'Multiple Choice, Multiple Answers' })).toBe(true);
    expect(allowsMultipleChoices({ typeId: 'custom-task', correctAnswers: ['A', 'B'] })).toBe(true);
    expect(allowsMultipleChoices({ typeId: 'custom-task', prompt: 'Choose TWO letters, A-E.' })).toBe(true);
  });

  it('returns false for undefined or single-answer prompts', () => {
    expect(allowsMultipleChoices(undefined)).toBe(false);
    expect(allowsMultipleChoices({ typeId: 'ielts-listening-mcq', prompt: 'Choose ONE letter, A, B or C.' })).toBe(false);
  });
});
