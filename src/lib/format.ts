import type { Apartment } from './types';

const euro = new Intl.NumberFormat('en-IE', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});

export const formatEuro = (n: number | null) => (n === null ? '—' : euro.format(n));

export function formatFacts(a: Pick<Apartment, 'rent_eur' | 'size_m2' | 'rooms'>): string {
  return [
    a.rent_eur !== null && `${euro.format(a.rent_eur)}/mo`,
    a.size_m2 !== null && `${a.size_m2} m²`,
    a.rooms !== null && `${a.rooms} rooms`,
  ].filter(Boolean).join(' · ');
}
