import { describe, expect, it } from 'vitest';
import { SYLLABUS } from '@/lib/syllabus';
import {
  TASK_TYPES,
  emptyGroup,
  emptyQuestion,
  groupPayload,
  PASSAGE_SLOT_TEMPLATES,
  createGroupsFromSlotTemplate,
} from '@/components/admin/readingTasks';

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
      'reading-mcq-single': 'IELTS',
      'reading-true-false': 'IELTS',
      'reading-yes-no-not-given': 'IELTS',
      'reading-find-the-paragraph': 'IELTS',
      'reading-sentence-completion': 'IELTS',
      'reading-arrange-passage': 'IELTS',
      'fill-in-blanks-rw': 'PTE',
      'reading-mcq-multiple': 'PTE',
      'reorder-paragraphs': 'PTE',
      'fill-in-blanks-r': 'PTE',
      'reading-mcq-single-pte': 'PTE',
    };

    for (const type of TASK_TYPES) {
      expect(type.exam, type.id).toBe(matrix[type.id]);
    }
    expect(TASK_TYPES.map(type => type.id).sort()).toEqual(Object.keys(matrix).sort());
  });

  it('offers multiple choice once per exam in authoring', () => {
    expect(
      TASK_TYPES.filter(type => type.exam === 'IELTS' && type.name.toLowerCase().includes('multiple choice')),
    ).toHaveLength(1);
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
    expect(groupPayload(emptyGroup('reading-mcq-single')).exams).toEqual(['IELTS']);
    expect(groupPayload(emptyGroup('reading-mcq-single-pte')).exams).toEqual(['PTE']);
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

describe('Passage A / B / C slot templates', () => {
  it('defines 13 questions for Passage A (7 Sentence Completion + 6 True/False)', () => {
    expect(PASSAGE_SLOT_TEMPLATES.A.totalQuestions).toBe(13);
    const groups = createGroupsFromSlotTemplate('A');
    expect(groups).toHaveLength(2);
    expect(groups[0].questions).toHaveLength(7);
    expect(groups[1].questions).toHaveLength(6);
  });

  it('defines 13 questions for Passage B (6 Writer/Paragraph + 4 Match Heading + 3 Yes/No/NG)', () => {
    expect(PASSAGE_SLOT_TEMPLATES.B.totalQuestions).toBe(13);
    const groups = createGroupsFromSlotTemplate('B');
    expect(groups).toHaveLength(3);
    expect(groups[0].questions).toHaveLength(6);
    expect(groups[1].questions).toHaveLength(4);
    expect(groups[2].questions).toHaveLength(3);
  });

  it('defines 14 questions for Passage C (6 Sentence Completion + 4 Matching Info + 4 Yes/No/NG)', () => {
    expect(PASSAGE_SLOT_TEMPLATES.C.totalQuestions).toBe(14);
    const groups = createGroupsFromSlotTemplate('C');
    expect(groups).toHaveLength(3);
    expect(groups[0].questions).toHaveLength(6);
    expect(groups[1].questions).toHaveLength(4);
    expect(groups[2].questions).toHaveLength(4);
  });

  it('totals exactly 40 questions across Passage A + B + C', () => {
    const total =
      PASSAGE_SLOT_TEMPLATES.A.totalQuestions +
      PASSAGE_SLOT_TEMPLATES.B.totalQuestions +
      PASSAGE_SLOT_TEMPLATES.C.totalQuestions;
    expect(total).toBe(40);
  });
});
