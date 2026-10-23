import { describe, expect, it } from 'vitest';
import { cleanWord, toEntry } from './lookup';

describe('cleanWord', () => {
  it('keeps one English word without punctuation', () => {
    expect(cleanWord(' Driving, ')).toBe('Driving');
    expect(cleanWord('"well-known"')).toBe('well-known');
  });
  it('rejects phrases, numbers, single letters and other scripts', () => {
    expect(cleanWord('two words')).toBeNull();
    expect(cleanWord('2024')).toBeNull();
    expect(cleanWord('a')).toBeNull();
    expect(cleanWord('학교')).toBeNull();
  });
});

describe('toEntry', () => {
  it('turns Wiktionary senses into plain text and finds the base word', () => {
    const entry = toEntry('driving', { en: [
      { partOfSpeech: 'Verb', definitions: [{ definition: '<span class="form-of-definition">present participle of <span class="form-of-definition-link"><i><a href="/wiki/drive#English">drive</a></i></span></span>' }] },
      { partOfSpeech: 'Adjective', definitions: [{ definition: 'Acting with <b>vigour</b>.', examples: ['a <i>driving</i> force'] }, { definition: '<span></span>' }] },
    ] });
    expect(entry).toEqual({
      word: 'driving',
      baseWord: 'drive',
      definitions: [
        { partOfSpeech: 'verb', text: 'present participle of drive' },
        { partOfSpeech: 'adjective', text: 'Acting with vigour.' },
      ],
      examples: ['a driving force'],
    });
  });
  it('returns null with no English senses', () => {
    expect(toEntry('zzz', { en: [] })).toBeNull();
    expect(toEntry('zzz', {})).toBeNull();
  });
});
