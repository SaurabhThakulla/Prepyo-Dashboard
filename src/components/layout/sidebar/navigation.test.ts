import { describe, expect, it } from 'vitest';
import { buildSections } from '@/components/layout/sidebar/navigation';
import { READING_TYPES } from '@/lib/readingTypes';

const readingItems = (exam: 'IELTS' | 'PTE', available?: string[]) =>
  (buildSections(exam, () => {}, null, available).find(section => section.id === 'practice')?.items ?? [])
    .filter(item => item.group === 'Reading')
    .map(item => item.label);

// A heading with nothing behind it is a link to an empty screen, so reading is
// checked against what the server says it can deal.
describe('the reading section of the practice menu', () => {
  it('shows every heading while the server has not answered yet', () => {
    expect(readingItems('IELTS')).toEqual([
      'Multiple Choice',
      'True / False / Not Given',
      'Yes / No / Not Given',
      'Find the paragraph',
      'Fill in the Blanks',
    ]);
  });

  it('keeps only the headings whose task types have questions', () => {
    expect(readingItems('IELTS', [READING_TYPES.mcqSingle, READING_TYPES.trueFalse])).toEqual([
      'Multiple Choice',
      'True / False / Not Given',
    ]);
  });

  it('keeps a heading when any one of the types behind it has questions', () => {
    expect(readingItems('IELTS', [READING_TYPES.matchingInformation])).toEqual(['Find the paragraph']);
  });

  it('shows nothing when the bank is empty, rather than five dead links', () => {
    expect(readingItems('IELTS', [])).toEqual([]);
    expect(readingItems('PTE', [])).toEqual([]);
  });

  it('leaves the other skills alone when reading is empty', () => {
    const items = buildSections('IELTS', () => {}, null, []).find(s => s.id === 'practice')?.items ?? [];
    expect(items.filter(item => item.group === 'Writing').length).toBeGreaterThan(0);
    expect(items.filter(item => item.group === 'Listening').length).toBeGreaterThan(0);
  });
});
