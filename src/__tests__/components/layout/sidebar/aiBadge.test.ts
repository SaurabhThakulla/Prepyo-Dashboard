import { describe, expect, it } from 'vitest';
import { buildSections } from '@/components/layout/sidebar/navigation';

const practice = (exam: 'PTE' | 'IELTS') =>
  buildSections(exam, () => {}, null, undefined, 0).find(s => s.id === 'practice')?.items ?? [];

describe('AI badge on practice tasks', () => {
  for (const exam of ['PTE', 'IELTS'] as const) {
    it(`marks every ${exam} writing and speaking task, and no reading or listening task`, () => {
      const tasks = practice(exam).filter(i => i.badge !== 'MOCK' && i.badge !== 'CORE' && i.badge !== 'PTEA');
      const ai = tasks.filter(i => /skill=(writing|speaking)&type=/.test(i.href ?? ''));
      const free = tasks.filter(i => /skill=(reading|listening)&type=/.test(i.href ?? ''));
      expect(ai.length).toBeGreaterThan(0);
      expect(ai.every(i => i.badge === 'AI')).toBe(true);
      expect(free.some(i => i.badge === 'AI')).toBe(false);
    });
  }
});
