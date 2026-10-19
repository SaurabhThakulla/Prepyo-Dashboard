import { describe, expect, it } from 'vitest';
import { formatClock, formatMinutes, isPteMockKind, PTE_MOCK_KINDS, pteMockHref, pteReportHref } from '@/lib/pteMock/catalog';
import { hasResponse } from '@/components/pteMock/items/ReadingItem';

describe('PTE mock catalog', () => {
  it('offers the full test first, then one sectional test per skill', () => {
    expect(PTE_MOCK_KINDS.map(k => k.kind)).toEqual(['full', 'speaking', 'writing', 'reading', 'listening']);
  });

  it('recognises only the kinds the server runs', () => {
    expect(isPteMockKind('reading')).toBe(true);
    expect(isPteMockKind('mini')).toBe(false);
    expect(isPteMockKind(undefined)).toBe(false);
  });

  it('builds the test and report routes', () => {
    expect(pteMockHref('full')).toBe('/mocks/pte/full');
    expect(pteReportHref('abc')).toBe('/mocks/pte/report/abc');
  });

  it('formats the test clock as the test shows it', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(59)).toBe('00:59');
    expect(formatClock(600)).toBe('10:00');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-5)).toBe('00:00');
  });

  it('formats durations', () => {
    expect(formatMinutes(30)).toBe('30 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(126)).toBe('2 h 6 min');
  });
});

describe('whether an item has been answered', () => {
  it('counts any text, choice or filled gap, and nothing else', () => {
    expect(hasResponse(undefined)).toBe(false);
    expect(hasResponse({ textResponse: '   ' })).toBe(false);
    expect(hasResponse({ blankResponses: { b1: ' ' } })).toBe(false);
    expect(hasResponse({ textResponse: 'word' })).toBe(true);
    expect(hasResponse({ selectedOptions: ['A'] })).toBe(true);
    expect(hasResponse({ blankResponses: { b1: 'cat' } })).toBe(true);
  });
});
