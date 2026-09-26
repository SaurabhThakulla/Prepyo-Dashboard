import { describe, expect, it } from 'vitest';
import { typeKey } from './syllabus';
import { getTaskMetadata } from './taskMetadata';

describe('getTaskMetadata', () => {
  it('names a task by its syllabus name, not the key the sidebar links with', () => {
    expect(getTaskMetadata('IELTS', 'reading', 'truefalsenotgiven').name).toBe('True / False / Not Given');
    expect(getTaskMetadata('IELTS', 'reading', 'multiplechoice').name).toBe('Multiple Choice');
  });

  it('finds the IELTS Task 2 entry under the key the sidebar links with', () => {
    expect(getTaskMetadata('IELTS', 'writing', 'opinionagreedisagree').name).toBe('Opinion / Agree or Disagree (Task 2)');
    for (const name of ['Discuss Both Views', 'Advantages / Disadvantages', 'Problem / Solution', 'Cause / Effect', 'Two-Part Question']) {
      const meta = getTaskMetadata('IELTS', 'writing', typeKey(name));
      expect(meta.name).toBe(`${name} (Task 2)`);
      expect(meta.code).toBe('W-T2');
    }
  });
});
