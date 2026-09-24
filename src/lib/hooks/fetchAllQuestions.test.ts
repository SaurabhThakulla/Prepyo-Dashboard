import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/lib/api', () => ({ api: { get: (...args: unknown[]) => get(...args) } }));

import { fetchAllQuestions } from './useResources';

const page = (from: number, count: number) => ({
  questions: Array.from({ length: count }, (_, i) => ({ id: `q${from + i}` })),
});

describe('fetchAllQuestions', () => {
  beforeEach(() => get.mockReset());

  it('reads every page of a skill with more questions than one page holds', async () => {
    get.mockResolvedValueOnce(page(0, 200)).mockResolvedValueOnce(page(200, 130));
    const { questions } = await fetchAllQuestions('IELTS', 'speaking');
    expect(questions).toHaveLength(330);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[1][1]).toMatchObject({ exam: 'IELTS', skill: 'speaking', limit: 200, offset: 200 });
  });

  it('stops after one request when the first page is not full', async () => {
    get.mockResolvedValueOnce(page(0, 43));
    const { questions } = await fetchAllQuestions('IELTS', 'listening');
    expect(questions).toHaveLength(43);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
