import type { Apartment, ApartmentInput } from './types';

export type FormState = {
  name: string; address: string; rent_eur: string; size_m2: string; rooms: string;
  floor: string; listing_url: string; visited_on: string; video_urls: string;
  notes: string; pros: string; cons: string;
};

export const EMPTY_FORM: FormState = {
  name: '', address: '', rent_eur: '', size_m2: '', rooms: '', floor: '',
  listing_url: '', visited_on: '', video_urls: '', notes: '', pros: '', cons: '',
};

const str = (v: string | number | null) => (v === null ? '' : String(v));
const text = (v: string) => v.trim() || null;
const num = (v: string) => {
  const n = Number(v.trim());
  return v.trim() === '' || Number.isNaN(n) ? null : n;
};

export function toForm(a: Apartment): FormState {
  return {
    name: a.name, address: str(a.address), rent_eur: str(a.rent_eur), size_m2: str(a.size_m2),
    rooms: str(a.rooms), floor: str(a.floor), listing_url: str(a.listing_url),
    visited_on: str(a.visited_on), video_urls: a.video_urls.join('\n'),
    notes: str(a.notes), pros: str(a.pros), cons: str(a.cons),
  };
}

export function toInput(f: FormState): ApartmentInput {
  return {
    name: f.name.trim(), address: text(f.address), rent_eur: num(f.rent_eur),
    size_m2: num(f.size_m2), rooms: num(f.rooms), floor: text(f.floor),
    listing_url: text(f.listing_url), visited_on: text(f.visited_on),
    video_urls: f.video_urls.split('\n').map((l) => l.trim()).filter(Boolean),
    notes: text(f.notes), pros: text(f.pros), cons: text(f.cons),
  };
}
