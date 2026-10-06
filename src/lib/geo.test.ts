import { describe, expect, it } from 'vitest';
import { distanceMeters, hasLocation, pricePerM2, walkMinutes } from './geo';

describe('geo', () => {
  const beach = { lat: 41.176484, lng: -8.6930137 };
  const metro = { lat: 41.1801219, lng: -8.6885901 };
  it('measures distance between two Matosinhos points (~540 m)', () => {
    expect(distanceMeters(beach, metro)).toBeGreaterThan(500);
    expect(distanceMeters(beach, metro)).toBeLessThan(600);
  });
  it('estimates walking minutes with a floor of 1', () => {
    expect(walkMinutes(beach, metro)).toBe(9);
    expect(walkMinutes(beach, beach)).toBe(1);
  });
  it('hasLocation narrows nulls', () => {
    expect(hasLocation({ lat: null, lng: 1 })).toBe(false);
    expect(hasLocation({ lat: 1, lng: 2 })).toBe(true);
  });
  it('pricePerM2 handles missing values', () => {
    expect(pricePerM2(1550, 106)).toBeCloseTo(14.62, 2);
    expect(pricePerM2(null, 106)).toBeNull();
    expect(pricePerM2(1000, 0)).toBeNull();
  });
});
