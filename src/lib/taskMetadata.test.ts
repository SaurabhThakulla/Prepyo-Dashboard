import { describe, expect, it } from 'vitest';
import { getTaskMetadata } from './taskMetadata';

describe('getTaskMetadata', () => {
  it('names a task by its syllabus name, not the key the sidebar links with', () => {
    expect(getTaskMetadata('IELTS', 'reading', 'truefalsenotgiven').name).toBe('True / False / Not Given');
    expect(getTaskMetadata('IELTS', 'reading', 'multiplechoice').name).toBe('Multiple Choice');
  });

  it('finds the IELTS Task 2 entry under the key the sidebar links with', () => {
    expect(getTaskMetadata('IELTS', 'writing', 'opinionagreedisagree').name).toBe('Opinion / Agree or Disagree (Task 2)');
  });
});
