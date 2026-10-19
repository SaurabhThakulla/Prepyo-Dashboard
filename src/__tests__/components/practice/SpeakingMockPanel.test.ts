import { describe, expect, it } from 'vitest';
import { storedLines, type Step } from '@/components/practice/SpeakingMockPanel';

const step = (patch: Partial<Step>): Step => ({ key: 'p1-1-1', part: 1, question: 'Do you work or study?', answerSeconds: 30, ...patch });

describe('the examiner’s stored recordings', () => {
  it('plays the lead and the question one after the other when both are recorded', () => {
    expect(
      storedLines(step({ lead: 'Let’s talk about work.', leadAudioUrl: '/a/lead', questionAudioUrl: '/a/q' }), 'all'),
    ).toEqual(['/a/lead', '/a/q']);
  });

  it('plays only the half that is asked for', () => {
    const s = step({ lead: 'Now a topic.', leadAudioUrl: '/a/lead', questionAudioUrl: '/a/q' });
    expect(storedLines(s, 'lead')).toEqual(['/a/lead']);
    expect(storedLines(s, 'question')).toEqual(['/a/q']);
  });

  it('needs no lead recording for a step with no lead', () => {
    expect(storedLines(step({ questionAudioUrl: '/a/q' }), 'all')).toEqual(['/a/q']);
  });

  it('falls back to the live voice when any piece has no recording', () => {
    expect(storedLines(step({ lead: 'Let’s talk about work.', questionAudioUrl: '/a/q' }), 'all')).toBeNull();
    expect(storedLines(step({}), 'question')).toBeNull();
  });
});
