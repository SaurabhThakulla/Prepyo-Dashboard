import { describe, expect, it } from 'vitest';
import { matchesTypeKey, typeKey, typeLabel } from '@/lib/syllabus';

describe('summary task spelling compatibility', () => {
  it.each(['Written Text', 'Spoken Text', 'Group Discussion'])('matches both spellings of %s', task => {
    const british = `Summarise ${task}`;
    const american = `Summarize ${task}`;
    expect(matchesTypeKey(british, typeKey(american))).toBe(true);
    expect(matchesTypeKey(american, typeKey(british))).toBe(true);
  });

  it('preserves generated URLs and supports headings for either spelling', () => {
    expect(typeKey('Summarise Written Text')).toBe('summarisewrittentext');
    expect(typeKey('Summarize Written Text')).toBe('summarizewrittentext');
    for (const key of ['summarisewrittentext', 'summarizewrittentext']) {
      expect(typeLabel('PTE', 'writing', key)).toBe('Summarise Written Text');
    }
  });

  it('does not mix summary tasks or unrelated task types', () => {
    expect(matchesTypeKey('Summarize Written Text', 'summarisespokentext')).toBe(false);
    expect(matchesTypeKey('Write Essay', 'summarisewrittentext')).toBe(false);
    expect(matchesTypeKey('Summarise Group Discussion', 'summarisewrittentext')).toBe(false);
    expect(matchesTypeKey('Write Essay', 'writeessay')).toBe(true);
  });

  it('matches single and multiple answer synonyms while strictly keeping them separate', () => {
    // Single answer synonym matches
    expect(matchesTypeKey('Multiple Choice, Single Answer', 'multipletypesingleanswer')).toBe(true);
    expect(matchesTypeKey('MCQ Single Answer', 'multipletypesingleanswer')).toBe(true);
    expect(matchesTypeKey('Multiple Type Single Answer', 'mcqsingleanswer')).toBe(true);
    expect(matchesTypeKey('pte-listening-mcsa', 'mcqsingleanswer')).toBe(true);

    // Multiple answer synonym matches
    expect(matchesTypeKey('Multiple Choice, Multiple Answers', 'multipletypemultipleanswer')).toBe(true);
    expect(matchesTypeKey('MCQ Multiple Answer', 'multipletypemultipleanswer')).toBe(true);
    expect(matchesTypeKey('Multiple Type Multiple Answer', 'mcqmultipleanswer')).toBe(true);
    expect(matchesTypeKey('pte-listening-mcma', 'mcqmultipleanswer')).toBe(true);

    // Strict cross-contamination prevention: single MUST NEVER match multiple
    expect(matchesTypeKey('Multiple Choice, Multiple Answers', 'multipletypesingleanswer')).toBe(false);
    expect(matchesTypeKey('Multiple Choice, Single Answer', 'multipletypemultipleanswer')).toBe(false);
    expect(matchesTypeKey('MCQ Multiple Answer', 'mcqsingleanswer')).toBe(false);
    expect(matchesTypeKey('MCQ Single Answer', 'mcqmultipleanswer')).toBe(false);
    expect(matchesTypeKey('Multiple Type Multiple Answer', 'multipletypesingleanswer')).toBe(false);
    expect(matchesTypeKey('Multiple Type Single Answer', 'multipletypemultipleanswer')).toBe(false);
  });
});

describe('IELTS module syllabus', () => {
  it('offers the letter to General Training and the figure to Academic', async () => {
    const { syllabusFor } = await import('@/lib/syllabus');
    const academic = syllabusFor('IELTS', 'writing', 'academic');
    const general = syllabusFor('IELTS', 'writing', 'general_training');
    expect(academic).toContain('Describe the figure');
    expect(academic).not.toContain('Write a letter');
    expect(general).toContain('Write a letter');
    expect(general).not.toContain('Describe the figure');
    // Task 2 is the same paper in both modules, and offers every essay type.
    for (const type of ['Opinion / Agree or Disagree', 'Discuss Both Views', 'Advantages / Disadvantages', 'Problem / Solution', 'Cause / Effect', 'Two-Part Question']) {
      expect(academic).toContain(type);
      expect(general).toContain(type);
    }
  });
});
