import type { Member } from './types';

// Members come sorted by display name (Maykale, Yuvalsss) → cyan, violet.
const PERSON_COLORS = ['#22d3ee', '#a78bfa'];

export function personColor(members: Member[], userId: string | null): string {
  const i = members.findIndex((m) => m.user_id === userId);
  return PERSON_COLORS[i] ?? '#a1a1aa';
}

export const colorAt = (index: number) => PERSON_COLORS[index] ?? '#a1a1aa';

export const initial = (name: string) => name.charAt(0).toUpperCase();
