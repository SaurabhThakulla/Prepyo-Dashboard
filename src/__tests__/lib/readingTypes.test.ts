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

    if (exam === 'IELTS') {
      it(`offers ${exam} one multiple-choice task, covering single and multiple answers`, () => {
        const names = SYLLABUS[exam].reading ?? [];
        const choices = names.filter(name => name.toLowerCase().includes('multiple choice'));
        expect(choices).toEqual(['Multiple Choice']);

        expect(typeIdsFor(typeKey('Multiple Choice'))).toEqual([
          READING_TYPES.mcqSingle,
          READING_TYPES.mcqMultiple,
        ]);
      });
    } else {
      it('offers PTE separate single and multiple answer choice tasks', () => {
        const names = SYLLABUS[exam].reading ?? [];
        expect(names).toContain('Multiple Type Single Answer');
        expect(names).toContain('Multiple Type Multiple Answer');
        expect(typeIdsFor(typeKey('Multiple Type Single Answer'))).toEqual([READING_TYPES.mcqSingle]);
        expect(typeIdsFor(typeKey('Multiple Type Multiple Answer'))).toEqual([READING_TYPES.mcqMultiple]);
      });
    }
  }

  // The verdict tasks and the paragraph-locating ones are IELTS inventions.
  // PTE Reading sets neither, so a heading for them on the PTE dashboard is a
  // promise the bank can never keep.
  it('offers the verdict and paragraph tasks to IELTS only', () => {
    const ielts = SYLLABUS.IELTS.reading ?? [];
    const pte = SYLLABUS.PTE.reading ?? [];

    for (const name of ['True / False / Not Given', 'Yes / No / Not Given', 'Matching Information']) {
      expect(ielts, name).toContain(name);
      expect(pte, name).not.toContain(name);
    }
  });

  it('offers the two gap-fills and re-ordering to PTE only', () => {
    const ielts = SYLLABUS.IELTS.reading ?? [];
    const pte = SYLLABUS.PTE.reading ?? [];

    for (const name of [
      'Fill in the Blanks (Dropdown)',
      'Reading Fill in the Blanks',
      'Reorder Paragraph',
    ]) {
      expect(pte, name).toContain(name);
      expect(ielts, name).not.toContain(name);
    }
  });


  it('never substitutes information or sequencing for heading matching', () => {
    expect(typeIdsFor(typeKey('Match The Heading'))).toEqual([]);
    expect(typeIdsFor(typeKey('Matching Information'))).toEqual([
      READING_TYPES.findTheParagraph, READING_TYPES.matchingInformation,
    ]);
  });

  // Links already in the wild keep working: the old headings were separate
  // menu entries, and their keys still resolve.
  it('keeps the retired headings resolvable', () => {
    expect(typeIdsFor('multiplechoicesingleanswer')).toEqual([READING_TYPES.mcqSingle]);
    expect(typeIdsFor('multiplechoicemultipleanswers')).toEqual([READING_TYPES.mcqMultiple]);
    expect(typeIdsFor('whichparagraphcontainsfollowinginformation')).toEqual([
      READING_TYPES.findTheParagraph,
      READING_TYPES.matchingInformation,
    ]);
    expect(typeIdsFor('matchinginformation')).toEqual([READING_TYPES.findTheParagraph, READING_TYPES.matchingInformation]);
    expect(typeIdsFor('arrangepassage')).toEqual([READING_TYPES.arrangePassage]);
  });

  it('resolves nothing for an unknown key rather than guessing', () => {
    expect(typeIdsFor('somethingelse')).toEqual([]);
    expect(typeIdsFor(undefined)).toEqual([]);
  });
});
