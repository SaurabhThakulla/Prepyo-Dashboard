import { describe, expect, it } from 'vitest';
import { SYLLABUS, typeKey } from '@/lib/syllabus';
import { READING_TYPES, typeIdsFor } from '@/lib/readingTypes';

const SERVER_TYPE_IDS = new Set<string>(Object.values(READING_TYPES));

// The dashboard builds its links from the syllabus names alone. A heading with
// no mapping links to a type the server has never heard of, and the learner
// lands on an empty state with no way to tell why.
describe('the reading dashboard', () => {
  for (const exam of ['IELTS', 'PTE'] as const) {
    it(`maps every ${exam} task to at least one server type`, () => {
      const names = SYLLABUS[exam].reading ?? [];
      expect(names.length).toBeGreaterThan(0);

      for (const name of names) {
        const ids = typeIdsFor(typeKey(name));
        expect(ids.length, `${name} (${typeKey(name)}) has no server type`).toBeGreaterThan(0);
        for (const id of ids) {
          expect(SERVER_TYPE_IDS.has(id), `${name} maps to unknown type ${id}`).toBe(true);
        }
      }
    });

    it(`offers ${exam} one multiple-choice task, covering single and multiple answers`, () => {
      const names = SYLLABUS[exam].reading ?? [];
      const choices = names.filter(name => name.toLowerCase().includes('multiple choice'));
      expect(choices).toEqual(['Multiple Choice']);

      expect(typeIdsFor(typeKey('Multiple Choice'))).toEqual([
        READING_TYPES.mcqSingle,
        READING_TYPES.mcqMultiple,
      ]);
    });

    it(`offers ${exam} both verdict tasks and the paragraph-locating one`, () => {
      const names = SYLLABUS[exam].reading ?? [];
      expect(names).toContain('True / False / Not Given');
      expect(names).toContain('Yes / No / Not Given');
      expect(names).toContain('Find the paragraph');
    });

    // Matching Information asks the same thing, so it sits behind the same
    // heading — as the fallback, not the first choice.
    it(`deals ${exam} Find the Paragraph behind the paragraph task`, () => {
      const ids = typeIdsFor(typeKey('Find the paragraph'));
      expect(ids[0]).toBe(READING_TYPES.findTheParagraph);
      expect(ids).toEqual([READING_TYPES.findTheParagraph, READING_TYPES.matchingInformation]);
    });
  }

  // Links already in the wild keep working: the old headings were separate
  // menu entries, and their keys still resolve.
  it('keeps the retired headings resolvable', () => {
    expect(typeIdsFor('multiplechoicesingleanswer')).toEqual([READING_TYPES.mcqSingle]);
    expect(typeIdsFor('multiplechoicemultipleanswers')).toEqual([READING_TYPES.mcqMultiple]);
    expect(typeIdsFor('whichparagraphcontainsfollowinginformation')).toEqual([
      READING_TYPES.findTheParagraph,
      READING_TYPES.matchingInformation,
    ]);
    expect(typeIdsFor('matchinginformation')).toEqual([READING_TYPES.matchingInformation]);
  });

  it('resolves nothing for an unknown key rather than guessing', () => {
    expect(typeIdsFor('somethingelse')).toEqual([]);
    expect(typeIdsFor(undefined)).toEqual([]);
  });
});
