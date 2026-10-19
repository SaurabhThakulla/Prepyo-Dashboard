import { describe, expect, it } from 'vitest';
import { minimumWritingWords, writingWordCount, writingWordTarget } from '@/lib/writing';

describe('writing feedback thresholds', () => {
  it('accepts five-word PTE summaries without lowering essay thresholds', () => {
    expect(minimumWritingWords({ exam: 'PTE', typeId: 'summarize-written-text' })).toBe(5);
    expect(minimumWritingWords({ exam: 'PTE', typeId: 'pte-write-essay' })).toBe(20);
  });
  it('lets any IELTS response be rated, since 20 words or fewer is Band 1', () => {
    expect(minimumWritingWords({ exam: 'IELTS', typeId: 'ielts-writing-task1-figure' })).toBe(1);
    expect(minimumWritingWords({ exam: 'IELTS', typeId: 'ielts-writing-task2-opinion' })).toBe(1);
  });
  it('knows the length each IELTS task asks for', () => {
    expect(writingWordTarget({ exam: 'IELTS', typeId: 'ielts-writing-task1-figure' })).toBe(150);
    expect(writingWordTarget({ exam: 'IELTS', typeId: 'ielts-writing-task1-letter' })).toBe(150);
    expect(writingWordTarget({ exam: 'IELTS', typeId: 'ielts-writing-task2-opinion' })).toBe(250);
    expect(writingWordTarget({ exam: 'PTE', typeId: 'pte-write-essay' })).toBeNull();
  });
  it('counts whitespace consistently with the backend', () => {
    expect(writingWordCount(' \n\t ')).toBe(0);
    expect(writingWordCount('  Trees\treduce urban\nheat effectively. ')).toBe(5);
    expect(writingWordCount('A well-known check-in desk')).toBe(4);
  });
});
