import { describe, expect, it } from 'vitest';
import { EMPTY_FORM, toForm, toInput } from './apartmentForm';

describe('apartment form mapping', () => {
  it('converts blanks to null, numbers to numbers, and splits video lines', () => {
    const input = toInput({
      ...EMPTY_FORM, name: '  Sunny flat ', rent_eur: '1450', size_m2: '62.5',
      video_urls: 'https://a\n\n  https://b  \n',
    });
    expect(input).toMatchObject({
      name: 'Sunny flat', address: null, rent_eur: 1450, size_m2: 62.5, rooms: null,
      video_urls: ['https://a', 'https://b'],
    });
  });
  it('round-trips an apartment', () => {
    const form = toForm({
      id: '1', created_at: '', name: 'A', address: null, rent_eur: 1000, size_m2: null,
      rooms: 2, floor: '3', listing_url: null, visited_on: '2026-10-01',
      video_urls: ['https://a', 'https://b'], notes: null, pros: 'light', cons: null, lat: null, lng: null, tags: [],
    });
    expect(form.rent_eur).toBe('1000');
    expect(form.video_urls).toBe('https://a\nhttps://b');
    expect(toInput(form).rooms).toBe(2);
  });
});
