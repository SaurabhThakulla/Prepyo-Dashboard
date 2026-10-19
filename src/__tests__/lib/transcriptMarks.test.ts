import { describe, expect, it } from 'vitest';
import { markTranscript } from '@/lib/transcriptMarks';

const transcript = "Thank you. Thank you. Thank you. Thank you. So myself, Sahara, and I am from Nepal, and I am currently studying my bachelor in computer application. So I am currently learning IELTS and trying to get to the foreign degree, my master degree after my vascular completion. I live in my locality and my city is Tikabu Kailagi. So yeah. Thank you.";

describe('markTranscript', () => {
  const words = markTranscript(transcript, [
    { original: 'So myself, Sahara, and I am from Nepal,', correction: 'My name is Sahara, and I am from Nepal,', issueType: 'grammar', explanation: '' },
    { original: 'my master degree after my vascular completion.', correction: "my master's degree after completing my bachelor's.", issueType: 'vocabulary', explanation: '' },
  ]);
  const marked = (mark: string) => words.filter(w => w.mark === mark).map(w => w.text);

  it('marks repeated thank-yous and "so yeah" as fillers, keeping the first', () => {
    expect(words[0].mark).toBe('good');
    expect(words[1].mark).toBe('good');
    expect(marked('filler')).toEqual(expect.arrayContaining(['Thank', 'you.', 'So', 'yeah.']));
    expect(words.slice(2, 8).every(w => w.mark === 'filler')).toBe(true);
  });

  it('marks only the words a correction changed', () => {
    expect(marked('error')).toEqual(expect.arrayContaining(['myself,', 'master', 'vascular', 'completion.']));
    expect(marked('error')).not.toContain('Nepal,');
    expect(words.find(w => w.text === 'vascular')?.note).toContain('completing');
  });

  it('leaves ordinary words good', () => {
    expect(words.find(w => w.text === 'Tikabu')?.mark).toBe('good');
  });
});
