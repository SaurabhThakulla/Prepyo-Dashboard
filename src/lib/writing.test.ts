import { describe, expect, it } from 'vitest';
import { minimumWritingWords, writingWordCount } from './writing';

describe('writing feedback thresholds', () => {
  it('accepts five-word PTE summaries without lowering essay thresholds', () => {
    expect(minimumWritingWords({ exam: 'PTE', typeId: 'summarize-written-text' })).toBe(5);
    expect(minimumWritingWords({ exam: 'PTE', typeId: 'pte-write-essay' })).toBe(20);
    expect(minimumWritingWords({ exam: 'IELTS', typeId: 'ielts-writing-task1-figure' })).toBe(20);
    expect(minimumWritingWords({ exam: 'IELTS', typeId: 'summarize-written-text' })).toBe(20);
  });
  it('counts whitespace consistently with the backend', () => {
    expect(writingWordCount(' \n\t ')).toBe(0);
    expect(writingWordCount('  Trees\treduce urban\nheat effectively. ')).toBe(5);
  });
});
