import type { LatLng } from './geo';

export type GeoResult = LatLng & { label: string };

// OpenStreetMap Nominatim: free, max ~1 request/second, so only call it on explicit user actions.
export async function searchPlaces(query: string, limit = 5): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    q: query, format: 'json', limit: String(limit), countrycodes: 'pt',
    viewbox: '-8.75,41.22,-8.58,41.13', // Matosinhos / north Porto; biases results, doesn't restrict
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  if (!res.ok) throw new Error(`Map search failed (${res.status})`);
  const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return rows.map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), label: r.display_name }));
}

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const [first] = await searchPlaces(address.includes('Matosinhos') ? address : `${address}, Matosinhos`, 1);
  return first ?? null;
}
