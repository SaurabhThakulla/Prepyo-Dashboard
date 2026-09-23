import { describe, expect, it } from 'vitest';
import { wordDiff } from './wordDiff';

describe('wordDiff', () => {
  it('marks only the word that changed', () => {
    expect(wordDiff('The data show that people is moving.', 'The data show that people are moving.')).toEqual([
      { kind: 'same', text: 'The data show that people' },
      { kind: 'removed', text: 'is' },
      { kind: 'added', text: 'are' },
      { kind: 'same', text: 'moving.' },
    ]);
  });

  it('handles a word added or dropped', () => {
    expect(wordDiff('He went to market.', 'He went to the market.')).toEqual([
      { kind: 'same', text: 'He went to' },
      { kind: 'added', text: 'the' },
      { kind: 'same', text: 'market.' },
    ]);
    expect(wordDiff('I very like it.', 'I like it.')).toEqual([
      { kind: 'same', text: 'I' },
      { kind: 'removed', text: 'very' },
      { kind: 'same', text: 'like it.' },
    ]);
  });

  it('keeps a rewrite of several words together', () => {
    expect(wordDiff('It is good for the healthy.', 'It benefits health.')).toEqual([
      { kind: 'same', text: 'It' },
      { kind: 'removed', text: 'is good for the healthy.' },
      { kind: 'added', text: 'benefits health.' },
    ]);
  });

  it('returns the sentence unchanged when nothing differs', () => {
    expect(wordDiff('All good here.', 'All good here.')).toEqual([{ kind: 'same', text: 'All good here.' }]);
  });
});
