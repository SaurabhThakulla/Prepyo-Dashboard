import { describe, expect, it } from 'vitest';
import { PTE_SECTIONS } from '@/components/pte/PtePracticeHub';
import { SYLLABUS } from '@/lib/syllabus';
import { buildSections } from '@/components/layout/sidebar/navigation';

describe('supported PTE speaking tasks', () => {
  it('keeps the hub, syllabus and sidebar aligned without the removed task', () => {
    const expected = [
      'Read Aloud',
      'Repeat Sentence',
      'Describe Image',
      'Re-tell Lecture',
      'Answer Short Questions',
      'Summarise Group Discussion',
    ];
    expect(PTE_SECTIONS.find(section => section.skill === 'speaking')?.tasks.map(task => task.name)).toEqual(expected);
    expect(SYLLABUS.PTE.speaking).toEqual(expected);
    const practice = buildSections('PTE', () => {}).find(section => section.id === 'practice');
    expect(practice?.items.filter(item => item.group === 'Speaking').map(item => item.label))
      .toEqual([...expected, 'Speaking Mock Test']);
  });
});
