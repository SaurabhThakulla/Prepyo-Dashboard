import { describe, expect, it } from 'vitest';
import { SYLLABUS } from '@/lib/syllabus';
import { TASK_TYPES, emptyGroup, emptyQuestion, groupPayload } from '@/components/admin/readingTasks';

// The admin authors what learners practise. A task offered in one list and not
// the other is either a dead end in the dashboard or content nobody can find,
// so the two lists are held to being the same list.
describe('the admin task catalogue', () => {
  for (const exam of ['IELTS', 'PTE'] as const) {
    it(`offers exactly the ${exam} tasks the dashboard lists`, () => {
      const dashboard = SYLLABUS[exam].reading ?? [];
      const admin = TASK_TYPES.filter(
        type => !type.mockOnly && (type.exam === 'both' || type.exam === exam),
      ).map(type => type.name);

      expect([...admin].sort()).toEqual([...dashboard].sort());
    });
  }

  it('keeps mock-only tasks authorable without putting them on the dashboard', () => {
    const matchHeading = TASK_TYPES.find(type => type.id === 'reading-arrange-passage');
    expect(matchHeading?.mockOnly).toBe(true);
    expect(matchHeading?.name).toBe('Match the Heading');
    expect(SYLLABUS.IELTS.reading ?? []).not.toContain(matchHeading?.name);
  });

  it('follows the exam matrix, task by task', () => {
    const matrix: Record<string, 'both' | 'IELTS' | 'PTE'> = {
      'reading-mcq-single': 'both',
      'fill-in-blanks-rw': 'PTE',
      'fill-in-blanks-r': 'PTE',
      'reorder-paragraphs': 'PTE',
      'reading-true-false': 'IELTS',
      'reading-yes-no-not-given': 'IELTS',
      'reading-find-the-paragraph': 'IELTS',
      'reading-arrange-passage': 'IELTS',
      'reading-sentence-completion': 'IELTS',
    };

    for (const type of TASK_TYPES) {
      expect(type.exam, type.id).toBe(matrix[type.id]);
    }
    expect(TASK_TYPES.map(type => type.id).sort()).toEqual(Object.keys(matrix).sort());
  });

  it('offers multiple choice once, not split by how many answers it takes', () => {
    expect(TASK_TYPES.filter(type => type.name.toLowerCase().includes('multiple choice'))).toHaveLength(1);
  });
});

// Which server type a multiple-choice set is stored as follows from its answer
// key, so the author never has to decide it twice.
describe('the payload a set is saved as', () => {
  const setWith = (...answers: string[][]) => {
    const group = emptyGroup('reading-mcq-single');
    group.questions = answers.map(correctAnswers => ({
      ...emptyQuestion(),
      prompt: 'Q',
      options: ['A', 'B', 'C'],
      correctAnswers,
    }));
    return group;
  };

  it('stays single-answer while every question has one answer', () => {
    expect(groupPayload(setWith(['A'], ['B'])).typeId).toBe('reading-mcq-single');
  });

  it('becomes multiple-answer as soon as one question has two', () => {
    expect(groupPayload(setWith(['A'], ['B', 'C'])).typeId).toBe('reading-mcq-multiple');
  });

  it('leaves every other task type alone', () => {
    const verdicts = emptyGroup('reading-true-false');
    expect(groupPayload(verdicts).typeId).toBe('reading-true-false');
  });

  it('names the exams the set is written for', () => {
    expect(groupPayload(emptyGroup('reading-mcq-single')).exams).toEqual(['PTE', 'IELTS']);
    expect(groupPayload(emptyGroup('fill-in-blanks-rw')).exams).toEqual(['PTE']);
    expect(groupPayload(emptyGroup('reading-sentence-completion')).exams).toEqual(['IELTS']);
  });

  it('narrows a shared task to the exam it was added under', () => {
    expect(groupPayload(emptyGroup('reading-mcq-single', ['IELTS'])).exams).toEqual(['IELTS']);
  });

  it('ignores an exam the task is not set by', () => {
    expect(groupPayload(emptyGroup('fill-in-blanks-rw', ['IELTS'])).exams).toEqual(['PTE']);
  });

  it('sends the boxes an ordering task is answered from', () => {
    const arrange = emptyGroup('reading-arrange-passage');
    arrange.boxes = [' first ', '', 'second'];
    expect(groupPayload(arrange).boxes).toEqual(['first', 'second']);
  });
});
