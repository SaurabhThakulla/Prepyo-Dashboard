import { describe, expect, it } from 'vitest';
import { matchesTypeKey, typeKey, typeLabel } from './syllabus';

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
});
