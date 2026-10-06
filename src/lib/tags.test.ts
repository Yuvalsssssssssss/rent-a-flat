import { describe, expect, it } from 'vitest';
import { isRejected, rejectedLast, toggleTag } from './tags';

describe('tags', () => {
  it('toggles a tag on and off', () => {
    expect(toggleTag(['visited'], 'rejected')).toEqual(['visited', 'rejected']);
    expect(toggleTag(['visited', 'rejected'], 'visited')).toEqual(['rejected']);
  });
  it('treats missing tags as none', () => {
    expect(isRejected({ tags: undefined as unknown as string[] })).toBe(false);
    expect(isRejected({ tags: ['rejected'] })).toBe(true);
  });
  it('moves rejected items last, keeping order', () => {
    expect(rejectedLast([1, 2, 3, 4], (n) => n % 2 === 1)).toEqual([2, 4, 1, 3]);
  });
});
