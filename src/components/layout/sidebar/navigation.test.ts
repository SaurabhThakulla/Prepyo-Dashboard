import { describe, expect, it } from 'vitest';
import { buildSections, getSectionFromPathname, isNavItemActive } from '@/components/layout/sidebar/navigation';
import { completeLesson, EMPTY_PROGRESS, LearnProgress } from '@/lib/learn/progress';
import { READING_TYPES } from '@/lib/readingTypes';
import { UserProfile } from '@/lib/types';

const readingItems = (exam: 'IELTS' | 'PTE', available?: string[]) =>
  (buildSections(exam, () => { }, null, available).find(section => section.id === 'practice')?.items ?? [])
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
      'Matching Information',
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
    expect(readingItems('IELTS', [READING_TYPES.matchingInformation])).toEqual(['Matching Information']);
  });

  it('shows nothing when the bank is empty, rather than five dead links', () => {
    expect(readingItems('IELTS', [])).toEqual([]);
    expect(readingItems('PTE', [])).toEqual([]);
  });

  it('offers the generated paper once the bank can deal one', () => {
    const items =
      buildSections('IELTS', () => { }, null, [READING_TYPES.trueFalse], 3).find(
        s => s.id === 'practice',
      )?.items ?? [];
    const mock = items.find(item => item.label === 'Reading Mock Test');

    expect(mock).toBeDefined();
    expect(mock?.group).toBe('Reading');
    expect(mock?.badge).toBe('MOCK');
    expect(mock?.href).toBe('/practice?skill=reading&mock=1');
    expect(mock?.sublabel).toContain('3 full passages');
  });

  it('sends every PTE skill to its sectional test on the PTE test player', () => {
    const items =
      buildSections('PTE', () => { }, null, [READING_TYPES.fillBlanksR], 4).find(
        s => s.id === 'practice',
      )?.items ?? [];

    for (const [skill, group] of [['reading', 'Reading'], ['speaking', 'Speaking'], ['writing', 'Writing'], ['listening', 'Listening']]) {
      const mock = items.find(item => item.label === `${group} Sectional Test`);
      expect(mock?.href).toBe(`/mocks/pte/${skill}`);
      expect(mock?.group).toBe(group);
    }
    expect(items.map(item => item.label)).not.toContain('Reading Mock Test');
  });

  it('groups the PTE mock menu into the full test and the sectional tests', () => {
    const mock = buildSections('PTE', () => { }).find(s => s.id === 'mock')?.items ?? [];
    const full = mock.filter(item => item.group === 'Full Mock Test');
    const sectional = mock.filter(item => item.group === 'Sectional Tests');

    expect(full.map(item => item.href)).toEqual(['/mocks/pte/full']);
    expect(sectional.map(item => item.href)).toEqual([
      '/mocks/pte/speaking', '/mocks/pte/writing', '/mocks/pte/reading', '/mocks/pte/listening',
    ]);
    expect(mock.find(item => item.href === '/mocks?tab=reports')).toBeDefined();
  });

  it('groups the IELTS mock menu into full test, sectional tests, and results', () => {
    const mock = buildSections('IELTS', () => { }).find(s => s.id === 'mock')?.items ?? [];
    expect(mock.some(item => item.href?.startsWith('/mocks/pte'))).toBe(false);
    expect(mock[0].label).toBe('IELTS Mock Test Centre');
    const full = mock.filter(item => item.group === 'Full Mock Test');
    const sectional = mock.filter(item => item.group === 'Sectional Tests');
    expect(full.map(item => item.href)).toEqual(['/mocks?view=full']);
    expect(sectional.map(item => item.href)).toEqual([
      '/practice?skill=speaking&mock=1',
      '/practice?skill=writing&mock=1',
      '/practice?skill=reading&mock=1',
      '/practice?skill=listening&mock=1',
    ]);
    expect(mock.find(item => item.href === '/mocks?tab=reports')).toBeDefined();
    expect(mock.find(item => item.href === '/diagnostic')).toBeDefined();
  });

  it('includes the tutorials primary section with all section lessons', () => {
    const sections = buildSections('IELTS', () => { });
    const tutorials = sections.find(s => s.id === 'tutorials');
    expect(tutorials).toBeDefined();
    expect(tutorials?.label).toBe('Tutorials');
    expect(tutorials?.items.map(i => i.href)).toEqual([
      '/tutorials',
      '/tutorials?skill=speaking',
      '/tutorials?skill=writing',
      '/tutorials?skill=reading',
      '/tutorials?skill=listening',
    ]);
  });

  it('hides the paper when there is no blueprint or nothing to build it from', () => {
    expect(readingItems('IELTS', [READING_TYPES.trueFalse])).not.toContain('Reading Mock Test');
    expect(
      (buildSections('IELTS', () => { }, null, [], 3).find(s => s.id === 'practice')?.items ?? [])
        .map(item => item.label),
    ).not.toContain('Reading Mock Test');
  });

  it('leaves the other skills alone when reading is empty', () => {
    const items = buildSections('IELTS', () => { }, null, []).find(s => s.id === 'practice')?.items ?? [];
    expect(items.filter(item => item.group === 'Writing').length).toBeGreaterThan(0);
    expect(items.filter(item => item.group === 'Listening').length).toBeGreaterThan(0);
  });
});

describe('the practice menu for an admin', () => {
  const admin = { role: 'admin' } as unknown as UserProfile;

  it('lists syllabus subtasks for the selected exam so admin can author questions for each task', () => {
    const ieltsItems = buildSections('IELTS', () => { }, admin).find(s => s.id === 'practice')?.items ?? [];
    expect(ieltsItems.filter(item => item.group === 'Speaking').map(i => i.label)).toEqual([
      'Introduction',
      'Speaking Part 2 (Cue Card)',
      'Speaking Part 3 (Discussion)',
    ]);
    // Admins author both IELTS modules' Writing Task 1.
    expect(ieltsItems.filter(item => item.group === 'Writing').map(i => i.label)).toEqual([
      'Describe the figure',
      'Write a letter',
      'Opinion / Agree or Disagree',
      'Discuss Both Views',
      'Advantages / Disadvantages',
      'Problem / Solution',
      'Cause / Effect',
      'Two-Part Question',
    ]);
    // Reading shows all syllabus topics for admin even when no available reading types are passed
    expect(ieltsItems.filter(item => item.group === 'Reading').map(i => i.label)).toEqual([
      'Multiple Choice',
      'True / False / Not Given',
      'Yes / No / Not Given',
      'Matching Information',
      'Fill in the Blanks',
    ]);

    const pteItems = buildSections('PTE', () => { }, admin).find(s => s.id === 'practice')?.items ?? [];
    expect(pteItems.filter(item => item.group === 'Speaking').map(i => i.label)).toEqual([
      'Read Aloud',
      'Repeat Sentence',
      'Describe Image',
      'Re-tell Lecture',
      'Answer Short Questions',
      'Summarise Group Discussion',
      'Respond to a Situation',
    ]);
    expect(pteItems.filter(item => item.group === 'Writing').map(i => i.label)).toEqual([
      'Summarise Written Text',
      'Write Essay',
    ]);
    const pteMistakeItems = buildSections('PTE', () => { }, admin, undefined, 0, true).find(s => s.id === 'practice')?.items ?? [];
    expect(pteMistakeItems.filter(item => item.group === 'Writing').map(i => i.label)).toEqual([
      'Summarise Written Text',
      'Write Essay',
      'Repeated Essay Questions',
    ]);
    expect(pteItems.find(i => i.label === 'Read Aloud')?.href).toBe('/practice?skill=speaking&type=readaloud');
  });
});

describe('which menu item is lit', () => {
  const items = buildSections('IELTS', () => { }, null, [READING_TYPES.trueFalse], 3).flatMap(
    section => section.items,
  );
  const lit = (url: string) => {
    const { pathname, searchParams } = new URL(url, 'http://localhost');
    return items.filter(item => isNavItemActive(item, pathname, searchParams)).map(item => item.label);
  };

  it('lights the reading mock while the paper is open', () => {
    expect(lit('/practice?skill=reading&mock=1')).toEqual(['Reading Mock Test', 'Reading Test']);
  });

  it('lights the speaking mock while the speaking mock is open', () => {
    expect(lit('/practice?skill=speaking&mock=1')).toEqual(['Speaking Mock Test', 'Speaking Test']);
  });

  it('lights the writing mock while the writing mock is open', () => {
    expect(lit('/practice?skill=writing&mock=1')).toEqual(['Writing Mock Test', 'Writing Test']);
  });

  it('lights the listening mock while the listening mock is open', () => {
    expect(lit('/practice?skill=listening&mock=1')).toEqual(['Listening Mock Test', 'Listening Test']);
  });

  it('does not light the reading mock on plain reading practice', () => {
    expect(lit('/practice?skill=reading')).not.toContain('Reading Mock Test');
  });

  it('lights the mock test centre on the catalogue, and full mock on view=full', () => {
    expect(lit('/mocks')).toEqual(['IELTS Mock Test Centre']);
    expect(lit('/mocks?view=full')).toEqual(['Full Mock Test']);
  });
});

describe('mock tests for all practice skills', () => {
  it('offers speaking, writing, and listening mock tests alongside syllabus task items', () => {
    const items = buildSections('IELTS', () => { }, null, [READING_TYPES.trueFalse], 3).find(
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

// Every IELTS Writing Task 2 essay type, in syllabus order.
const TASK2_TYPES = [
  'Opinion / Agree or Disagree',
  'Discuss Both Views',
  'Advantages / Disadvantages',
  'Problem / Solution',
  'Cause / Effect',
  'Two-Part Question',
];

describe('the IELTS writing menu for a learner', () => {
  const writing = (module?: 'academic' | 'general_training') =>
    (buildSections('IELTS', () => { }, { role: 'suru', targetExam: 'IELTS', targetModule: module } as unknown as UserProfile)
      .find(s => s.id === 'practice')?.items ?? [])
      .filter(item => item.group === 'Writing' && item.badge !== 'MOCK')
      .map(item => item.label);

  it('offers Academic learners the figure and General Training learners the letter', () => {
    expect(writing('academic')).toEqual(['Describe the figure', ...TASK2_TYPES]);
    expect(writing('general_training')).toEqual(['Write a letter', ...TASK2_TYPES]);
    // A profile from before modules existed is Academic.
    expect(writing(undefined)).toEqual(['Describe the figure', ...TASK2_TYPES]);
  });
});

describe('the EPS-TOPIK practice menu', () => {
  const practice = (available?: string[]) =>
    buildSections('EPS_TOPIK', () => { }, null, available).find(section => section.id === 'practice');

  it('has Reading and Listening headings and nothing for speaking or writing', () => {
    const groups = [...new Set((practice()?.items ?? []).map(item => item.group))];
    expect(groups).toEqual(['Reading', 'Listening']);
  });

  it('lists the official subtasks under each heading, with no borrowed IELTS or PTE mocks', () => {
    const items = practice()?.items ?? [];
    expect(items.filter(item => item.group === 'Reading').map(item => item.label)).toEqual([
      'Picture to Word or Sentence',
      'Correct Underlined Grammar',
      'Signs, Notices and Charts',
      'Related Word',
      'Fill in the Blank',
      'Word from Description',
      'Passage Topic',
      'Matching Statement',
      'Description to Picture',
    ]);
    expect(items.filter(item => item.group === 'Listening').map(item => item.label)).toEqual([
      'Choose What You Heard',
      'Listen and Choose Picture',
      'Choose the Right Reply',
      'What Comes Next',
      'Numbers, Dates and Prices',
      'Picture Question',
      'Dialogue Comprehension',
    ]);
    expect(items.some(item => item.badge === 'MOCK')).toBe(false);
  });

  it('keeps its reading tasks when the passage bank is empty, since they are not on passages', () => {
    expect((practice([])?.items ?? []).filter(item => item.group === 'Reading')).toHaveLength(9);
  });

  it('is titled with the exam name, not its identifier', () => {
    expect(practice()?.title).toBe('EPS-TOPIK Practice Studio');
  });
});

describe('the Learn Korean menu', () => {
  const learn = (progress?: LearnProgress) =>
    buildSections('EPS_TOPIK', () => { }, null, undefined, 0, false, progress).find(s => s.id === 'learn');

  it('sits right after Practice for EPS-TOPIK, and nowhere for IELTS or PTE', () => {
    expect(buildSections('EPS_TOPIK', () => { }).map(s => s.id)).toEqual(['home', 'practice', 'learn', 'aicoach', 'mock', 'tutorials']);
    expect(buildSections('IELTS', () => { }).some(s => s.id === 'learn')).toBe(false);
    expect(buildSections('PTE', () => { }).some(s => s.id === 'learn')).toBe(false);
  });

  it('leads with the path, then one heading per unit with its lessons', () => {
    const items = learn()?.items ?? [];
    expect(items[0]).toMatchObject({ href: '/learn', label: 'My Path' });
    expect([...new Set(items.slice(1).map(i => i.group))]).toEqual([
      'Unit 1 · Hangul',
      'Unit 2 · Basic Korean',
      'Unit 3 · EPS Vocabulary',
      'Unit 4 · Daily Life',
      'Unit 5 · EPS-TOPIK',
    ]);
    // The path, four units of five lessons, and sixteen exam tasks.
    expect(items).toHaveLength(1 + 20 + 16);
    expect(items[1]).toMatchObject({ href: '/learn/hangul/vowels', groupHref: '/learn?unit=hangul' });
    expect(items.find(i => i.href === '/learn/eps-topik/l2')?.label).toBe('L2 · Listen and Choose Picture');
  });

  it('marks done lessons and says what opens a locked one', () => {
    const before = learn()?.items ?? [];
    expect(before.find(i => i.href === '/learn/hangul/consonants')?.sublabel).toContain('Locked');

    const { progress } = completeLesson(EMPTY_PROGRESS, 'hangul', 'vowels', 0);
    const after = learn(progress)?.items ?? [];
    expect(after.find(i => i.href === '/learn/hangul/vowels')?.badge).toBe('Done');
    expect(after.find(i => i.href === '/learn/hangul/consonants')?.sublabel).not.toContain('Locked');
    expect(after[0].sublabel).toContain('15 XP');
  });

  it('selects the Learn section on course pages and lights the open lesson', () => {
    expect(getSectionFromPathname('/learn')).toBe('learn');
    expect(getSectionFromPathname('/learn/hangul/vowels')).toBe('learn');
    const items = learn()?.items ?? [];
    const lit = (url: string) => {
      const { pathname, searchParams } = new URL(url, 'http://localhost');
      return items.filter(item => isNavItemActive(item, pathname, searchParams)).map(item => item.label);
    };
    expect(lit('/learn/hangul/vowels')).toEqual(['Vowels']);
    expect(lit('/learn')).toEqual(['My Path']);
  });
});
