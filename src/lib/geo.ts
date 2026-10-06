export type LatLng = { lat: number; lng: number };

/** Matosinhos Sul, the default map centre. */
export const DEFAULT_CENTER: LatLng = { lat: 41.1805, lng: -8.6895 };

export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Estimated walk: straight line × 1.3 for street detours, at 5 km/h. */
export function walkMinutes(a: LatLng, b: LatLng): number {
  return Math.max(1, Math.round((distanceMeters(a, b) * 1.3) / (5000 / 60)));
}

export function hasLocation<T extends { lat: number | null; lng: number | null }>(x: T): x is T & LatLng {
  return x.lat !== null && x.lng !== null;
}

export function pricePerM2(rent: number | null, size: number | null): number | null {
  return rent === null || size === null || size <= 0 ? null : rent / size;
}
