import type { Apartment } from './types';

export const TAG_IDS = ['visited', 'negotiating', 'rejected'] as const;
export type TagId = (typeof TAG_IDS)[number];

export const tagsOf = (a: Pick<Apartment, 'tags'>): string[] => a.tags ?? [];
export const isRejected = (a: Pick<Apartment, 'tags'>) => tagsOf(a).includes('rejected');

export function toggleTag(tags: string[], tag: TagId): string[] {
  return tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
}

/** Stable partition: non-rejected first, rejected last. */
export function rejectedLast<T>(items: T[], rejected: (item: T) => boolean): T[] {
  return [...items.filter((x) => !rejected(x)), ...items.filter(rejected)];
}
