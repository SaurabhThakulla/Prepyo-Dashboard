import { describe, expect, it } from 'vitest';
import { assignVoices, scriptLanguage, splitSentences, splitTurns } from './listeningScript';

describe('splitTurns', () => {
  it('drops speaker labels and keeps each turn with its speaker', () => {
    const turns = splitTurns(
      'Receptionist: The daytime course is full. Caller: Which day is it? Receptionist: It used to be on Tuesday; from next month it will be Thursday.',
    );
    expect(turns).toEqual([
      { speaker: 'Receptionist', text: 'The daytime course is full.' },
      { speaker: 'Caller', text: 'Which day is it?' },
      { speaker: 'Receptionist', text: 'It used to be on Tuesday; from next month it will be Thursday.' },
    ]);
  });

  it('treats a script without a leading label as one turn', () => {
    expect(splitTurns('Go north from the entrance. Note: the café is closed.')).toEqual([
      { speaker: null, text: 'Go north from the entrance. Note: the café is closed.' },
    ]);
  });

  it('handles a monologue with a single label', () => {
    expect(splitTurns('Guide: The main gallery is closed.')).toEqual([
      { speaker: 'Guide', text: 'The main gallery is closed.' },
    ]);
  });

  it('splits Korean dialogues labelled the way EPS-TOPIK scripts are', () => {
    expect(splitTurns('여: 지금 뭐 해요? 남: 상자를 옮기고 있어요.')).toEqual([
      { speaker: '여', text: '지금 뭐 해요?' },
      { speaker: '남', text: '상자를 옮기고 있어요.' },
    ]);
  });

  it('reads an unlabelled Korean word as one turn', () => {
    expect(splitTurns('공장')).toEqual([{ speaker: null, text: '공장' }]);
  });
});

describe('scriptLanguage', () => {
  it('reads a script with Hangul in Korean and anything else in English', () => {
    expect(scriptLanguage('남: 고향이 어디예요?')).toBe('ko');
    expect(scriptLanguage('Caller: Which day is it?')).toBe('en');
  });
});

describe('assignVoices', () => {
  const voices = [
    { name: 'US one', lang: 'en-US' },
    { name: 'GB one', lang: 'en-GB' },
    { name: 'GB two', lang: 'en-GB' },
    { name: 'AU one', lang: 'en-AU' },
    { name: 'French', lang: 'fr-FR' },
  ];

  it('gives each speaker a different accent where the device has one', () => {
    const assigned = assignVoices(['Receptionist', 'Caller', 'Manager'], voices);
    expect(assigned.get('Receptionist')?.lang).toBe('en-GB');
    expect(assigned.get('Caller')?.lang).toBe('en-AU');
    expect(assigned.get('Manager')?.lang).toBe('en-US');
  });

  it('never picks a non-English voice', () => {
    const assigned = assignVoices(['A', 'B', 'C', 'D', 'E'], voices);
    for (const voice of assigned.values()) expect(voice?.lang.startsWith('en')).toBe(true);
  });

  it('gives a Korean script Korean voices only', () => {
    const withKorean = [...voices, { name: 'Korean one', lang: 'ko-KR' }, { name: 'Korean two', lang: 'ko-KR' }];
    const assigned = assignVoices(['여', '남'], withKorean, 'ko');
    expect(assigned.get('여')?.name).toBe('Korean one');
    expect(assigned.get('남')?.name).toBe('Korean two');
  });

  it('leaves a Korean script unassigned on a device with no Korean voice', () => {
    const assigned = assignVoices(['여'], voices, 'ko');
    expect(assigned.get('여')).toBeUndefined();
  });
});

describe('splitSentences', () => {
  it('keeps each sentence whole and short enough for the browser voice', () => {
    const text = 'The lake was once a quarry. It filled with water! Did you know? ' + 'word '.repeat(80);
    const pieces = splitSentences(text, 120);
    expect(pieces.slice(0, 3)).toEqual(['The lake was once a quarry.', 'It filled with water!', 'Did you know?']);
    for (const piece of pieces) expect(piece.length).toBeLessThanOrEqual(120);
    expect(pieces.join(' ').split(/\s+/).length).toBe(text.trim().split(/\s+/).length);
  });
});
