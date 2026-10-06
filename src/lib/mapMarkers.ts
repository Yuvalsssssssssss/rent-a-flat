import type { MapMarker } from '../components/LeafletMap';
import { formatTotal, scoreTone } from './scoring';
import type { Place } from './types';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function placeMarker(p: Place): MapMarker {
  return {
    id: `place-${p.id}`, lat: p.lat, lng: p.lng, size: 30, tooltip: esc(p.name),
    html: `<div style="width:30px;height:30px;display:grid;place-items:center;border-radius:9999px;background:#1a1a1f;border:1px solid #3f3f46;font-size:15px;box-shadow:0 4px 12px rgb(0 0 0/.5)">${esc(p.emoji)}</div>`,
  };
}

export function apartmentMarker(
  a: { id: string; name: string; lat: number; lng: number }, combined: number | null, extra?: Partial<MapMarker>,
): MapMarker {
  const tone = scoreTone(combined === null ? null : combined / 10);
  return {
    id: a.id, lat: a.lat, lng: a.lng, size: 38, tooltip: esc(a.name), front: true,
    html: `<div style="width:38px;height:38px;display:grid;place-items:center;border-radius:9999px;background:${combined === null ? '#3f3f46' : tone.fg};color:#09090b;font:600 13px Inter,sans-serif;border:2px solid #09090b;box-shadow:0 0 0 2px ${combined === null ? '#52525b' : tone.fg},0 6px 16px rgb(0 0 0/.6);cursor:pointer">${formatTotal(combined)}</div>`,
    ...extra,
  };
}
