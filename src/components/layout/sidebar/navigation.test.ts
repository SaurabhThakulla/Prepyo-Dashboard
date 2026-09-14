import { describe, expect, it } from 'vitest';
import { buildSections, isNavItemActive } from '@/components/layout/sidebar/navigation';
import { READING_TYPES } from '@/lib/readingTypes';
import { UserProfile } from '@/lib/types';

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

  it('offers the generated paper once the bank can deal one', () => {
    const items =
      buildSections('IELTS', () => {}, null, [READING_TYPES.trueFalse], 3).find(
        s => s.id === 'practice',
      )?.items ?? [];
    const mock = items.find(item => item.label === 'Reading Mock Test');

    expect(mock).toBeDefined();
    expect(mock?.group).toBe('Reading');
    expect(mock?.badge).toBe('MOCK');
    expect(mock?.href).toBe('/practice?skill=reading&mock=1');
    expect(mock?.sublabel).toContain('3 full passages');
  });

  it('keeps the paper under reading practice for PTE too', () => {
    const items =
      buildSections('PTE', () => {}, null, [READING_TYPES.fillBlanksR], 4).find(
        s => s.id === 'practice',
      )?.items ?? [];
    const mock = items.find(item => item.label === 'Reading Mock Test');

    expect(mock?.href).toBe('/practice?skill=reading&mock=1');
    expect(mock?.sublabel).toContain('4 full passages');
  });

  it('hides the paper when there is no blueprint or nothing to build it from', () => {
    expect(readingItems('IELTS', [READING_TYPES.trueFalse])).not.toContain('Reading Mock Test');
    expect(
      (buildSections('IELTS', () => {}, null, [], 3).find(s => s.id === 'practice')?.items ?? [])
        .map(item => item.label),
    ).not.toContain('Reading Mock Test');
  });

  it('leaves the other skills alone when reading is empty', () => {
    const items = buildSections('IELTS', () => {}, null, []).find(s => s.id === 'practice')?.items ?? [];
    expect(items.filter(item => item.group === 'Writing').length).toBeGreaterThan(0);
    expect(items.filter(item => item.group === 'Listening').length).toBeGreaterThan(0);
  });
});

describe('the practice menu for an admin', () => {
  const admin = { role: 'admin' } as unknown as UserProfile;

  it('replaces every skill’s task links with its authoring screen', () => {
    const items = buildSections('IELTS', () => {}, admin).find(s => s.id === 'practice')?.items ?? [];
    expect(items.map(item => [item.group, item.href, item.badge])).toEqual([
      ['Speaking', '/practice?skill=speaking', 'Admin'],
      ['Writing', '/practice?skill=writing', 'Admin'],
      ['Reading', '/practice?skill=reading', 'Admin'],
      ['Listening', '/practice?skill=listening', 'Admin'],
    ]);
  });
});

describe('which menu item is lit', () => {
  const items = buildSections('IELTS', () => {}, null, [READING_TYPES.trueFalse], 3).flatMap(
    section => section.items,
  );
  const lit = (url: string) => {
    const { pathname, searchParams } = new URL(url, 'http://localhost');
    return items.filter(item => isNavItemActive(item, pathname, searchParams)).map(item => item.label);
  };

  it('lights the reading mock, not the full mock, while the paper is open', () => {
    expect(lit('/practice?skill=reading&mock=1')).toEqual(['Reading Mock Test']);
  });

  it('lights the speaking mock while the speaking mock is open', () => {
    expect(lit('/practice?skill=speaking&mock=1')).toEqual(['Speaking Mock Test']);
  });

  it('lights the writing mock while the writing mock is open', () => {
    expect(lit('/practice?skill=writing&mock=1')).toEqual(['Writing Mock Test']);
  });

  it('lights the listening mock while the listening mock is open', () => {
    expect(lit('/practice?skill=listening&mock=1')).toEqual(['Listening Mock Test']);
  });

  it('does not light the reading mock on plain reading practice', () => {
    expect(lit('/practice?skill=reading')).not.toContain('Reading Mock Test');
  });

  it('still lights the full mock on the catalogue', () => {
    expect(lit('/mocks')).toEqual(['Full Mock Simulator']);
  });
});

describe('mock tests for all practice skills', () => {
  it('offers speaking, writing, and listening mock tests alongside syllabus task items', () => {
    const items = buildSections('IELTS', () => {}, null, [READING_TYPES.trueFalse], 3).find(
      s => s.id === 'practice',
    )?.items ?? [];

    const speakingMock = items.find(item => item.label === 'Speaking Mock Test');
    expect(speakingMock).toBeDefined();
    expect(speakingMock?.group).toBe('Speaking');
    expect(speakingMock?.badge).toBe('MOCK');
    expect(speakingMock?.href).toBe('/practice?skill=speaking&mock=1');

    const writingMock = items.find(item => item.label === 'Writing Mock Test');
    expect(writingMock).toBeDefined();
    expect(writingMock?.group).toBe('Writing');
    expect(writingMock?.badge).toBe('MOCK');
    expect(writingMock?.href).toBe('/practice?skill=writing&mock=1');

    const listeningMock = items.find(item => item.label === 'Listening Mock Test');
    expect(listeningMock).toBeDefined();
    expect(listeningMock?.group).toBe('Listening');
    expect(listeningMock?.badge).toBe('MOCK');
    expect(listeningMock?.href).toBe('/practice?skill=listening&mock=1');
  });
});
