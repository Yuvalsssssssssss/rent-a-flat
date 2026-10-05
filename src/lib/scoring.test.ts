import { describe, expect, it } from 'vitest';
import {
  average, formatTotal, getScore, indexScores, isDisagreement,
  personTotal, rankSummaries, scoreColor, summarize,
} from './scoring';
import type { Category, Score } from './types';

const cats: Category[] = [
  { id: 'view', name: 'View', weight: 4, position: 0 },
  { id: 'size', name: 'Size', weight: 2, position: 1 },
  { id: 'ignored', name: 'Ignored', weight: 0, position: 2 },
];
const s = (apartment_id: string, category_id: string, user_id: string, score: number): Score =>
  ({ apartment_id, category_id, user_id, score });

describe('personTotal', () => {
  it('is the weighted average times 10', () => {
    const idx = indexScores([s('a', 'view', 'u1', 8), s('a', 'size', 'u1', 5)]);
    // (4*8 + 2*5) / 6 * 10 = 70
    expect(personTotal(cats, idx, 'a', 'u1')).toBeCloseTo(70);
  });
  it('skips unscored and zero-weight categories', () => {
    const idx = indexScores([s('a', 'view', 'u1', 6), s('a', 'ignored', 'u1', 1)]);
    expect(personTotal(cats, idx, 'a', 'u1')).toBeCloseTo(60);
  });
  it('is null when nothing is scored or user is null', () => {
    const idx = indexScores([]);
    expect(personTotal(cats, idx, 'a', 'u1')).toBeNull();
    expect(personTotal(cats, idx, 'a', null)).toBeNull();
  });
});

describe('summarize', () => {
  it('averages person totals and flags incomplete', () => {
    const idx = indexScores([
      s('a', 'view', 'u1', 8), s('a', 'size', 'u1', 5),
      s('a', 'view', 'u2', 4),
    ]);
    const sum = summarize('a', cats, idx, ['u1', 'u2']);
    expect(sum.totals[0]).toBeCloseTo(70);
    expect(sum.totals[1]).toBeCloseTo(40);
    expect(sum.combined).toBeCloseTo(55);
    expect(sum.incomplete).toBe(true); // u2 missed size
  });
  it('is complete when every weighted category is scored by everyone', () => {
    const idx = indexScores([
      s('a', 'view', 'u1', 8), s('a', 'size', 'u1', 5),
      s('a', 'view', 'u2', 4), s('a', 'size', 'u2', 4),
    ]);
    expect(summarize('a', cats, idx, ['u1', 'u2']).incomplete).toBe(false);
  });
  it('treats a member without an account as missing', () => {
    const idx = indexScores([s('a', 'view', 'u1', 8), s('a', 'size', 'u1', 8)]);
    const sum = summarize('a', cats, idx, ['u1', null]);
    expect(sum.combined).toBeCloseTo(80);
    expect(sum.incomplete).toBe(true);
  });
});

describe('rankSummaries', () => {
  it('sorts by combined desc with nulls last, without mutating input', () => {
    const input = [
      { apartmentId: 'x', totals: [], combined: null, incomplete: true },
      { apartmentId: 'y', totals: [], combined: 50, incomplete: false },
      { apartmentId: 'z', totals: [], combined: 80, incomplete: false },
    ];
    expect(rankSummaries(input).map((r) => r.apartmentId)).toEqual(['z', 'y', 'x']);
    expect(input[0].apartmentId).toBe('x');
  });
});

describe('helpers', () => {
  it('getScore returns null for missing', () => {
    const idx = indexScores([s('a', 'view', 'u1', 3)]);
    expect(getScore(idx, 'a', 'view', 'u1')).toBe(3);
    expect(getScore(idx, 'a', 'size', 'u1')).toBeNull();
    expect(getScore(idx, 'a', 'view', null)).toBeNull();
  });
  it('average ignores nulls', () => {
    expect(average([4, null, 8])).toBe(6);
    expect(average([null])).toBeNull();
  });
  it('isDisagreement needs two scores 3+ apart', () => {
    expect(isDisagreement([2, 5])).toBe(true);
    expect(isDisagreement([2, 4])).toBe(false);
    expect(isDisagreement([2, null])).toBe(false);
  });
  it('scoreColor maps 1 to red, 10 to green, null to grey', () => {
    expect(scoreColor(1)).toBe('hsl(0 70% 85%)');
    expect(scoreColor(10)).toBe('hsl(120 70% 85%)');
    expect(scoreColor(null)).toBe('#e5e7eb');
  });
  it('formatTotal rounds or shows a dash', () => {
    expect(formatTotal(69.6)).toBe('70');
    expect(formatTotal(null)).toBe('—');
  });
});
