import type { Category, Score } from './types';

export type ScoreIndex = Map<string, number>;

export type Summary = {
  apartmentId: string;
  /** One entry per member, in the same order as the memberIds passed to summarize. */
  totals: (number | null)[];
  combined: number | null;
  incomplete: boolean;
};

const key = (apartmentId: string, categoryId: string, userId: string) =>
  `${apartmentId}|${categoryId}|${userId}`;

export function indexScores(scores: Score[]): ScoreIndex {
  return new Map(scores.map((s) => [key(s.apartment_id, s.category_id, s.user_id), s.score]));
}

export function getScore(
  index: ScoreIndex, apartmentId: string, categoryId: string, userId: string | null,
): number | null {
  if (!userId) return null;
  return index.get(key(apartmentId, categoryId, userId)) ?? null;
}

export function personTotal(
  categories: Category[], index: ScoreIndex, apartmentId: string, userId: string | null,
): number | null {
  let weighted = 0;
  let weights = 0;
  for (const c of categories) {
    if (c.weight <= 0) continue;
    const score = getScore(index, apartmentId, c.id, userId);
    if (score === null) continue;
    weighted += c.weight * score;
    weights += c.weight;
  }
  return weights === 0 ? null : (weighted / weights) * 10;
}

export function average(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
}

export function summarize(
  apartmentId: string, categories: Category[], index: ScoreIndex, memberIds: (string | null)[],
): Summary {
  const totals = memberIds.map((u) => personTotal(categories, index, apartmentId, u));
  const weighted = categories.filter((c) => c.weight > 0);
  const incomplete = memberIds.some((u) =>
    weighted.some((c) => getScore(index, apartmentId, c.id, u) === null));
  return { apartmentId, totals, combined: average(totals), incomplete };
}

export function rankSummaries(summaries: Summary[]): Summary[] {
  return [...summaries].sort((a, b) => {
    if (a.combined === null) return b.combined === null ? 0 : 1;
    if (b.combined === null) return -1;
    return b.combined - a.combined;
  });
}

export function isDisagreement(values: (number | null)[]): boolean {
  const present = values.filter((v): v is number => v !== null);
  return present.length >= 2 && Math.max(...present) - Math.min(...present) >= 3;
}

/** Background colour for a 1–10 value: red (1) → green (10); grey when null. */
export function scoreColor(score: number | null): string {
  if (score === null) return '#e5e7eb';
  const t = (Math.min(10, Math.max(1, score)) - 1) / 9;
  return `hsl(${Math.round(t * 120)} 70% 85%)`;
}

export function formatTotal(total: number | null): string {
  return total === null ? '—' : String(Math.round(total));
}
