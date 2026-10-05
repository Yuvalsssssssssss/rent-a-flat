# rent-a-flat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-first web app where two people score apartments per weighted category and see a ranking and a side-by-side comparison, synced across devices.

**Architecture:** A static React SPA (Vite, hash router) talks directly to Supabase (Postgres + Auth) through `supabase-js`. All data is loaded into one React context (`DataProvider`), and the UI derives scores from it with pure functions in `src/lib/scoring.ts`. It is deployed to GitHub Pages by GitHub Actions.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), react-router-dom 7 (HashRouter), @supabase/supabase-js 2, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-05-rent-a-flat-design.md`.
- UI language: English. Currency: EUR, formatted with `Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })`.
- Scores are integers 1–10, and weights are integers 0–5.
- Person total = Σ(weight × score) / Σ(weight) × 10, over the categories that person scored with weight > 0. With no such categories the total is `null`, displayed as "—".
- Combined = mean of the non-null person totals.
- Disagreement = two present scores differing by ≥ 3.
- Mobile-first: everything must work at 390px width. Inputs use `text-base` (16px) so iOS doesn't zoom.
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (the publishable/anon key).
- No member emails or passwords in committed files.
- Git identity is katzir95@gmail.com. `gh` commands run with `GH_TOKEN="$(gh auth token --user Yuvalsssssssssss)"`.

## File Structure

```
package.json, tsconfig.json, vite.config.ts, index.html, .gitignore, .env.local (ignored)
supabase/schema.sql                 tables, RLS, members() RPC, seed categories
supabase/members.local.sql          (ignored) allowlist inserts with real emails
src/main.tsx                        React entry
src/index.css                       Tailwind import + component classes
src/App.tsx                         auth session → DataProvider → Gate → routes
src/lib/types.ts                    Category, Apartment, ApartmentInput, Score, Member
src/lib/scoring.ts (+ .test.ts)     pure scoring math, colors, formatting of totals
src/lib/video.ts (+ .test.ts)       Drive/YouTube link → embed URL
src/lib/format.ts                   euro + facts line
src/lib/apartmentForm.ts (+ .test.ts) form state <-> ApartmentInput
src/lib/supabase.ts                 client
src/lib/data.tsx                    DataProvider/useData: load + mutations
src/components/Toast.tsx            error toasts
src/components/FullScreenMessage.tsx
src/components/Layout.tsx           header + bottom tab bar
src/components/Field.tsx            label wrapper
src/components/ScoreRow.tsx         1–10 tap buttons for one category
src/components/VideoEmbed.tsx       iframe or fallback link
src/pages/SignIn.tsx
src/pages/Ranking.tsx
src/pages/Compare.tsx
src/pages/ApartmentPage.tsx
src/pages/ApartmentForm.tsx
src/pages/Categories.tsx
.github/workflows/deploy.yml
```

---

### Task 1: Scaffold + scoring logic

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `src/lib/types.ts`, `src/lib/scoring.ts`, `src/lib/scoring.test.ts`

**Interfaces:**
- Produces: the types `Category`, `Apartment`, `ApartmentInput`, `Score`, `Member`; and `indexScores(scores): ScoreIndex`, `getScore(index, aptId, catId, userId|null): number|null`, `personTotal(categories, index, aptId, userId|null): number|null`, `summarize(aptId, categories, index, memberIds: (string|null)[]): Summary`, `rankSummaries(Summary[]): Summary[]`, `average((number|null)[]): number|null`, `isDisagreement((number|null)[]): boolean`, `scoreColor(score1to10|null): string`, `formatTotal(number|null): string`.

- [ ] **Step 1: Write the config files**

`package.json`:
```json
{
  "name": "rent-a-flat",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: { environment: 'node' },
});
```

`.gitignore`:
```
node_modules
dist
.env.local
*.local.sql
.DS_Store
```

Run: `npm install react react-dom react-router-dom @supabase/supabase-js && npm install -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite vitest @types/react @types/react-dom`

- [ ] **Step 2: Write `src/lib/types.ts`**

```ts
export type Category = {
  id: string;
  name: string;
  weight: number;
  position: number;
};

export type Apartment = {
  id: string;
  name: string;
  address: string | null;
  rent_eur: number | null;
  size_m2: number | null;
  rooms: number | null;
  floor: string | null;
  listing_url: string | null;
  visited_on: string | null;
  video_urls: string[];
  notes: string | null;
  pros: string | null;
  cons: string | null;
  created_at: string;
};

export type ApartmentInput = Omit<Apartment, 'id' | 'created_at'>;

export type Score = {
  apartment_id: string;
  category_id: string;
  user_id: string;
  score: number;
};

export type Member = {
  user_id: string | null;
  email: string;
  display_name: string;
};
```

- [ ] **Step 3: Write the failing test `src/lib/scoring.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  average, formatTotal, getScore, indexScores, isDisagreement,
  personTotal, rankSummaries, scoreColor, summarize,
} from './scoring';
import type { Category, Score } from './types';

const cats: Category[] = [
  { id: 'view', name: 'View', weight: 4, position: 0 },
  { id: 'size', name: 'Size', weight: 2, position: 1 },
  { id: 'ignored', name: 'Ignored', weight: 0, position: 2 },
];
const s = (apartment_id: string, category_id: string, user_id: string, score: number): Score =>
  ({ apartment_id, category_id, user_id, score });

describe('personTotal', () => {
  it('is the weighted average times 10', () => {
    const idx = indexScores([s('a', 'view', 'u1', 8), s('a', 'size', 'u1', 5)]);
    // (4*8 + 2*5) / 6 * 10 = 70
    expect(personTotal(cats, idx, 'a', 'u1')).toBeCloseTo(70);
  });
  it('skips unscored and zero-weight categories', () => {
    const idx = indexScores([s('a', 'view', 'u1', 6), s('a', 'ignored', 'u1', 1)]);
    expect(personTotal(cats, idx, 'a', 'u1')).toBeCloseTo(60);
  });
  it('is null when nothing is scored or user is null', () => {
    const idx = indexScores([]);
    expect(personTotal(cats, idx, 'a', 'u1')).toBeNull();
    expect(personTotal(cats, idx, 'a', null)).toBeNull();
  });
});

describe('summarize', () => {
  it('averages person totals and flags incomplete', () => {
    const idx = indexScores([
      s('a', 'view', 'u1', 8), s('a', 'size', 'u1', 5),
      s('a', 'view', 'u2', 4),
    ]);
    const sum = summarize('a', cats, idx, ['u1', 'u2']);
    expect(sum.totals[0]).toBeCloseTo(70);
    expect(sum.totals[1]).toBeCloseTo(40);
    expect(sum.combined).toBeCloseTo(55);
    expect(sum.incomplete).toBe(true); // u2 missed size
  });
  it('is complete when every weighted category is scored by everyone', () => {
    const idx = indexScores([
      s('a', 'view', 'u1', 8), s('a', 'size', 'u1', 5),
      s('a', 'view', 'u2', 4), s('a', 'size', 'u2', 4),
    ]);
    expect(summarize('a', cats, idx, ['u1', 'u2']).incomplete).toBe(false);
  });
  it('treats a member without an account as missing', () => {
    const idx = indexScores([s('a', 'view', 'u1', 8), s('a', 'size', 'u1', 8)]);
    const sum = summarize('a', cats, idx, ['u1', null]);
    expect(sum.combined).toBeCloseTo(80);
    expect(sum.incomplete).toBe(true);
  });
});

describe('rankSummaries', () => {
  it('sorts by combined desc with nulls last, without mutating input', () => {
    const input = [
      { apartmentId: 'x', totals: [], combined: null, incomplete: true },
      { apartmentId: 'y', totals: [], combined: 50, incomplete: false },
      { apartmentId: 'z', totals: [], combined: 80, incomplete: false },
    ];
    expect(rankSummaries(input).map((r) => r.apartmentId)).toEqual(['z', 'y', 'x']);
    expect(input[0].apartmentId).toBe('x');
  });
});

describe('helpers', () => {
  it('getScore returns null for missing', () => {
    const idx = indexScores([s('a', 'view', 'u1', 3)]);
    expect(getScore(idx, 'a', 'view', 'u1')).toBe(3);
    expect(getScore(idx, 'a', 'size', 'u1')).toBeNull();
    expect(getScore(idx, 'a', 'view', null)).toBeNull();
  });
  it('average ignores nulls', () => {
    expect(average([4, null, 8])).toBe(6);
    expect(average([null])).toBeNull();
  });
  it('isDisagreement needs two scores 3+ apart', () => {
    expect(isDisagreement([2, 5])).toBe(true);
    expect(isDisagreement([2, 4])).toBe(false);
    expect(isDisagreement([2, null])).toBe(false);
  });
  it('scoreColor maps 1 to red, 10 to green, null to grey', () => {
    expect(scoreColor(1)).toBe('hsl(0 70% 85%)');
    expect(scoreColor(10)).toBe('hsl(120 70% 85%)');
    expect(scoreColor(null)).toBe('#e5e7eb');
  });
  it('formatTotal rounds or shows a dash', () => {
    expect(formatTotal(69.6)).toBe('70');
    expect(formatTotal(null)).toBe('—');
  });
});
```

- [ ] **Step 4: Run it and verify it fails**

Run: `npm test`
Expected: FAIL, "Failed to resolve import ./scoring".

- [ ] **Step 5: Write `src/lib/scoring.ts`**

```ts
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
```

- [ ] **Step 6: Run tests, expect PASS** with `npm test`.

- [ ] **Step 7: Commit** with message `feat: scaffold project and scoring logic`.

---

### Task 2: Video links + form mapping + formatting

**Files:**
- Create: `src/lib/video.ts`, `src/lib/video.test.ts`, `src/lib/apartmentForm.ts`, `src/lib/apartmentForm.test.ts`, `src/lib/format.ts`

**Interfaces:**
- Consumes: `Apartment`, `ApartmentInput` from Task 1.
- Produces: `toEmbed(raw: string): VideoEmbed` where `VideoEmbed = { kind: 'drive' | 'youtube'; embedUrl: string } | { kind: 'link'; url: string }`; `type FormState`, `EMPTY_FORM`, `toForm(a: Apartment): FormState`, `toInput(f: FormState): ApartmentInput`; `formatEuro(n: number | null): string`, `formatFacts(a): string`.

- [ ] **Step 1: Write the failing tests**

`src/lib/video.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { toEmbed } from './video';

describe('toEmbed', () => {
  it('handles Google Drive file links', () => {
    expect(toEmbed('https://drive.google.com/file/d/ABC_123-x/view?usp=sharing')).toEqual({
      kind: 'drive', embedUrl: 'https://drive.google.com/file/d/ABC_123-x/preview',
    });
    expect(toEmbed('https://drive.google.com/open?id=XYZ')).toEqual({
      kind: 'drive', embedUrl: 'https://drive.google.com/file/d/XYZ/preview',
    });
  });
  it('handles YouTube links', () => {
    const embed = { kind: 'youtube', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' };
    expect(toEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3')).toEqual(embed);
    expect(toEmbed('https://youtu.be/dQw4w9WgXcQ?si=abc')).toEqual(embed);
    expect(toEmbed('https://youtube.com/shorts/dQw4w9WgXcQ')).toEqual(embed);
    expect(toEmbed('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual(embed);
  });
  it('falls back to a plain link', () => {
    expect(toEmbed(' https://example.com/x ')).toEqual({ kind: 'link', url: 'https://example.com/x' });
    expect(toEmbed('not a url')).toEqual({ kind: 'link', url: 'not a url' });
  });
});
```

`src/lib/apartmentForm.test.ts`:
```ts
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
      video_urls: ['https://a', 'https://b'], notes: null, pros: 'light', cons: null,
    });
    expect(form.rent_eur).toBe('1000');
    expect(form.video_urls).toBe('https://a\nhttps://b');
    expect(toInput(form).rooms).toBe(2);
  });
});
```

- [ ] **Step 2: Run `npm test` and expect FAIL** (imports don't resolve).

- [ ] **Step 3: Implement**

`src/lib/video.ts`:
```ts
export type VideoEmbed =
  | { kind: 'drive' | 'youtube'; embedUrl: string }
  | { kind: 'link'; url: string };

export function toEmbed(raw: string): VideoEmbed {
  const url = raw.trim();
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { kind: 'link', url };
  }
  const host = u.hostname.replace(/^(www|m)\./, '');

  if (host === 'drive.google.com') {
    const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1]
      ?? (u.pathname === '/open' ? u.searchParams.get('id') : null);
    if (id) return { kind: 'drive', embedUrl: `https://drive.google.com/file/d/${id}/preview` };
  }

  let ytId: string | null = null;
  if (host === 'youtu.be') ytId = u.pathname.split('/')[1] || null;
  if (host === 'youtube.com') {
    ytId = u.searchParams.get('v')
      ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]
      ?? null;
  }
  if (ytId) return { kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytId}` };

  return { kind: 'link', url };
}
```

`src/lib/apartmentForm.ts`:
```ts
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
```

`src/lib/format.ts`:
```ts
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
```

- [ ] **Step 4: Run `npm test` and expect PASS.**
- [ ] **Step 5: Commit** with message `feat: video embeds, form mapping, formatting`.

---

### Task 3: Supabase schema + client + sign-in + app shell

**Files:**
- Create: `supabase/schema.sql`, `supabase/members.local.sql` (git-ignored), `.env.local` (git-ignored), `index.html`, `src/main.tsx`, `src/index.css`, `src/lib/supabase.ts`, `src/lib/data.tsx`, `src/components/Toast.tsx`, `src/components/FullScreenMessage.tsx`, `src/components/Field.tsx`, `src/components/Layout.tsx`, `src/pages/SignIn.tsx`, `src/App.tsx`, and placeholder pages `src/pages/{Ranking,Compare,ApartmentPage,ApartmentForm,Categories}.tsx` (each `export default function X() { return <h1 className="text-xl font-bold">X</h1>; }`; Tasks 4–6 replace them).

**Interfaces:**
- Consumes: the types and `indexScores` / `ScoreIndex` from Task 1.
- Produces: `useData()` returning `{ status, me, members, categories, apartments, scores, scoreIndex, reload, saveApartment(input, id?) => Promise<string|null>, deleteApartment(id) => Promise<boolean>, setScore(aptId, catId, score|null) => Promise<void>, addCategory(name) => Promise<void>, updateCategory(id, patch: {name?, weight?}) => Promise<void>, deleteCategory(id) => Promise<void>, moveCategory(id, -1|1) => Promise<void> }`; `useToast(): (text: string) => void`; `<Field label hint?>`; CSS classes `card btn btn-primary btn-danger input label`.

- [ ] **Step 1: Write `supabase/schema.sql`**

```sql
-- rent-a-flat schema. Run once in the Supabase SQL editor.
create table public.allowed_emails (
  email text primary key,
  display_name text not null
);

create or replace function public.is_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

create or replace function public.members()
returns table (user_id uuid, email text, display_name text)
language sql stable security definer set search_path = public, auth as $$
  select u.id, a.email, a.display_name
  from public.allowed_emails a
  left join auth.users u on lower(u.email) = lower(a.email)
  where public.is_allowed()
  order by a.display_name;
$$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  weight int not null default 3 check (weight between 0 and 5),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.apartments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  rent_eur numeric,
  size_m2 numeric,
  rooms numeric,
  floor text,
  listing_url text,
  visited_on date,
  video_urls text[] not null default '{}',
  notes text,
  pros text,
  cons text,
  created_at timestamptz not null default now()
);

create table public.scores (
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  score int not null check (score between 1 and 10),
  updated_at timestamptz not null default now(),
  primary key (apartment_id, category_id, user_id)
);

alter table public.allowed_emails enable row level security;
alter table public.categories enable row level security;
alter table public.apartments enable row level security;
alter table public.scores enable row level security;

create policy "members read" on public.allowed_emails for select to authenticated using (public.is_allowed());
create policy "members all" on public.categories for all to authenticated using (public.is_allowed()) with check (public.is_allowed());
create policy "members all" on public.apartments for all to authenticated using (public.is_allowed()) with check (public.is_allowed());
create policy "members read" on public.scores for select to authenticated using (public.is_allowed());
create policy "own insert" on public.scores for insert to authenticated with check (public.is_allowed() and user_id = auth.uid());
create policy "own update" on public.scores for update to authenticated using (public.is_allowed() and user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own delete" on public.scores for delete to authenticated using (public.is_allowed() and user_id = auth.uid());

grant select on public.allowed_emails to authenticated;
grant select, insert, update, delete on public.categories, public.apartments, public.scores to authenticated;
grant execute on function public.is_allowed(), public.members() to authenticated;
revoke execute on function public.members() from anon;

insert into public.categories (name, weight, position) values
  ('Location', 3, 0), ('View', 3, 1), ('Size & layout', 3, 2), ('Balcony / outdoor', 3, 3),
  ('Price', 3, 4), ('Natural light', 3, 5), ('Kitchen', 3, 6), ('Quiet', 3, 7),
  ('Condition', 3, 8), ('Building & area', 3, 9);
```

`supabase/members.local.sql` (git-ignored):
```sql
insert into public.allowed_emails (email, display_name) values
  ('katzir95@gmail.com', 'Yuvalsss'),
  ('mayzmora@gmail.com', 'Maykale');
```

`.env.local` (git-ignored):
```
VITE_SUPABASE_URL=https://abwddruuyblozeexfgny.supabase.co
VITE_SUPABASE_KEY=sb_publishable_PccZ89MLpcYHGJObLGtM_g_p8ep1L02
```

- [ ] **Step 2: USER CHECKPOINT. Supabase dashboard setup**
  1. SQL Editor: run `supabase/schema.sql`, then `supabase/members.local.sql`.
  2. Authentication → Users → Add user → Create new user, for each email, with a password and **Auto Confirm User** ticked.
  3. Authentication → Sign In / Providers: turn off **Allow new users to sign up**.
  4. Verify with `curl -s "$URL/rest/v1/apartments?select=id" -H "apikey: $KEY"`. Expected output: `[]` (anon sees nothing).

- [ ] **Step 3: Write the entry files**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#ffffff" />
    <title>rent-a-flat</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/index.css`:
```css
@import "tailwindcss";

:root { color-scheme: light; }
body { @apply bg-slate-50 text-slate-900 antialiased; }

@layer components {
  .card { @apply rounded-2xl border border-slate-200 bg-white p-4 shadow-sm; }
  .btn { @apply inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40; }
  .btn-primary { @apply inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50; }
  .btn-danger { @apply inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50; }
  .input { @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200; }
  .label { @apply mb-1 block text-sm font-medium text-slate-600; }
}
```

`src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined;
if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_KEY');

export const supabase = createClient(url, key);
```

- [ ] **Step 4: Write the shared components**

`src/components/Toast.tsx`:
```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const ToastContext = createContext<(text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const show = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} role="alert" className="w-full max-w-md rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
```

`src/components/FullScreenMessage.tsx`:
```tsx
type Props = { text: string; action?: { label: string; onClick: () => void } };

export default function FullScreenMessage({ text, action }: Props) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="space-y-3">
        <p className="text-slate-600">{text}</p>
        {action && <button className="btn" onClick={action.onClick}>{action.label}</button>}
      </div>
    </div>
  );
}
```

`src/components/Field.tsx`:
```tsx
import type { ReactNode } from 'react';

export default function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
```

`src/components/Layout.tsx`:
```tsx
import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useData } from '../lib/data';

const TABS = [
  { to: '/', label: 'Ranking', end: true },
  { to: '/compare', label: 'Compare', end: false },
  { to: '/categories', label: 'Categories', end: false },
];

export default function Layout() {
  const { members, me } = useData();
  const myName = members.find((m) => m.user_id === me)?.display_name;
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" className="font-bold">🏠 rent-a-flat</NavLink>
          <nav className="hidden gap-1 sm:flex">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end}
                className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="text-sm text-slate-500">
            {myName} · <button className="underline" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 sm:pb-10">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="grid grid-cols-3">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => `py-3 text-center text-sm font-medium ${isActive ? 'text-indigo-700' : 'text-slate-500'}`}>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 5: Write `src/lib/data.tsx`**

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { useToast } from '../components/Toast';
import { indexScores, type ScoreIndex } from './scoring';
import type { Apartment, ApartmentInput, Category, Member, Score } from './types';

type Status = 'loading' | 'ready' | 'error';

type DataContextValue = {
  status: Status;
  me: string;
  members: Member[];
  categories: Category[];
  apartments: Apartment[];
  scores: Score[];
  scoreIndex: ScoreIndex;
  reload: () => Promise<void>;
  saveApartment: (input: ApartmentInput, id?: string) => Promise<string | null>;
  deleteApartment: (id: string) => Promise<boolean>;
  setScore: (apartmentId: string, categoryId: string, score: number | null) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  updateCategory: (id: string, patch: { name?: string; weight?: number }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  moveCategory: (id: string, direction: -1 | 1) => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const toast = useToast();
  const [status, setStatus] = useState<Status>('loading');
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [scores, setScores] = useState<Score[]>([]);

  const reload = useCallback(async () => {
    const [m, c, a, s] = await Promise.all([
      supabase.rpc('members'),
      supabase.from('categories').select('id,name,weight,position').order('position').order('created_at'),
      supabase.from('apartments').select('*').order('created_at'),
      supabase.from('scores').select('apartment_id,category_id,user_id,score'),
    ]);
    const error = m.error ?? c.error ?? a.error ?? s.error;
    if (error) {
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
      toast(`Couldn't load data: ${error.message}`);
      return;
    }
    setMembers(m.data as Member[]);
    setCategories(c.data as Category[]);
    setApartments(a.data as Apartment[]);
    setScores(s.data as Score[]);
    setStatus('ready');
  }, [toast]);

  useEffect(() => {
    reload();
    const onVisible = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  const fail = useCallback((what: string, message: string) => {
    toast(`Couldn't ${what}: ${message}`);
    reload();
  }, [toast, reload]);

  const saveApartment = async (input: ApartmentInput, id?: string) => {
    const { data, error } = id
      ? await supabase.from('apartments').update(input).eq('id', id).select().single()
      : await supabase.from('apartments').insert(input).select().single();
    if (error) { toast(`Couldn't save apartment: ${error.message}`); return null; }
    const saved = data as Apartment;
    setApartments((list) => (id ? list.map((x) => (x.id === id ? saved : x)) : [...list, saved]));
    return saved.id;
  };

  const deleteApartment = async (id: string) => {
    const { error } = await supabase.from('apartments').delete().eq('id', id);
    if (error) { toast(`Couldn't delete apartment: ${error.message}`); return false; }
    setApartments((list) => list.filter((x) => x.id !== id));
    setScores((list) => list.filter((s) => s.apartment_id !== id));
    return true;
  };

  const setScore = async (apartmentId: string, categoryId: string, score: number | null) => {
    const match = { apartment_id: apartmentId, category_id: categoryId, user_id: userId };
    setScores((list) => {
      const rest = list.filter((s) => !(s.apartment_id === apartmentId && s.category_id === categoryId && s.user_id === userId));
      return score === null ? rest : [...rest, { ...match, score }];
    });
    const { error } = score === null
      ? await supabase.from('scores').delete().match(match)
      : await supabase.from('scores').upsert({ ...match, score, updated_at: new Date().toISOString() });
    if (error) fail('save score', error.message);
  };

  const addCategory = async (name: string) => {
    const position = categories.reduce((max, c) => Math.max(max, c.position), -1) + 1;
    const { data, error } = await supabase.from('categories')
      .insert({ name, weight: 3, position }).select('id,name,weight,position').single();
    if (error) { toast(`Couldn't add category: ${error.message}`); return; }
    setCategories((list) => [...list, data as Category]);
  };

  const updateCategory = async (id: string, patch: { name?: string; weight?: number }) => {
    setCategories((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await supabase.from('categories').update(patch).eq('id', id);
    if (error) fail('update category', error.message);
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { toast(`Couldn't delete category: ${error.message}`); return; }
    setCategories((list) => list.filter((c) => c.id !== id));
    setScores((list) => list.filter((s) => s.category_id !== id));
  };

  const moveCategory = async (id: string, direction: -1 | 1) => {
    const i = categories.findIndex((c) => c.id === id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= categories.length) return;
    const list = [...categories];
    [list[i], list[j]] = [list[j], list[i]];
    const next = list.map((c, idx) => ({ ...c, position: idx }));
    const changed = next.filter((c) => categories.find((o) => o.id === c.id)!.position !== c.position);
    setCategories(next);
    const results = await Promise.all(changed.map((c) =>
      supabase.from('categories').update({ position: c.position }).eq('id', c.id)));
    const error = results.find((r) => r.error)?.error;
    if (error) fail('reorder categories', error.message);
  };

  const scoreIndex = useMemo(() => indexScores(scores), [scores]);

  return (
    <DataContext.Provider value={{
      status, me: userId, members, categories, apartments, scores, scoreIndex, reload,
      saveApartment, deleteApartment, setScore, addCategory, updateCategory, deleteCategory, moveCategory,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error('useData must be used inside DataProvider');
  return value;
}
```

- [ ] **Step 6: Write `src/pages/SignIn.tsx` and `src/App.tsx`**

`src/pages/SignIn.tsx`:
```tsx
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import Field from '../components/Field';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold">🏠 rent-a-flat</h1>
          <p className="text-sm text-slate-500">Sign in to compare apartments.</p>
        </div>
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
```

`src/App.tsx`:
```tsx
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { DataProvider, useData } from './lib/data';
import { ToastProvider } from './components/Toast';
import FullScreenMessage from './components/FullScreenMessage';
import Layout from './components/Layout';
import SignIn from './pages/SignIn';
import Ranking from './pages/Ranking';
import Compare from './pages/Compare';
import Categories from './pages/Categories';
import ApartmentPage from './pages/ApartmentPage';
import ApartmentForm from './pages/ApartmentForm';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <FullScreenMessage text="Loading…" />;
  return (
    <ToastProvider>
      {session ? (
        <DataProvider key={session.user.id} userId={session.user.id}>
          <Gate />
        </DataProvider>
      ) : <SignIn />}
    </ToastProvider>
  );
}

function Gate() {
  const { status, members, me, reload } = useData();
  if (status === 'loading') return <FullScreenMessage text="Loading…" />;
  if (status === 'error') return <FullScreenMessage text="Couldn't load data." action={{ label: 'Retry', onClick: reload }} />;
  if (!members.some((m) => m.user_id === me)) {
    return <FullScreenMessage text="This account isn't allowed to use rent-a-flat." action={{ label: 'Sign out', onClick: () => supabase.auth.signOut() }} />;
  }
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Ranking />} />
          <Route path="compare" element={<Compare />} />
          <Route path="categories" element={<Categories />} />
          <Route path="apartment/new" element={<ApartmentForm />} />
          <Route path="apartment/:id" element={<ApartmentPage />} />
          <Route path="apartment/:id/edit" element={<ApartmentForm />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
```

- [ ] **Step 7: Verify.** `npm run build` passes. Run `npm run dev` and confirm the sign-in page renders at 390px. After the user signs in, the placeholder Ranking page shows with their name in the header.
- [ ] **Step 8: Commit** with message `feat: supabase schema, auth, data layer, app shell`.

---

### Task 4: Ranking + Compare pages

**Files:**
- Modify (replace placeholders): `src/pages/Ranking.tsx`, `src/pages/Compare.tsx`

**Interfaces:**
- Consumes: `useData`, `summarize`, `rankSummaries`, `getScore`, `average`, `isDisagreement`, `scoreColor`, `formatTotal`, `formatEuro`, `formatFacts`.

- [ ] **Step 1: Write `src/pages/Ranking.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { useData } from '../lib/data';
import { formatTotal, rankSummaries, scoreColor, summarize } from '../lib/scoring';
import { formatFacts } from '../lib/format';

export default function Ranking() {
  const { apartments, categories, scoreIndex, members } = useData();
  const memberIds = members.map((m) => m.user_id);
  const ranked = rankSummaries(apartments.map((a) => summarize(a.id, categories, scoreIndex, memberIds)));
  const byId = new Map(apartments.map((a) => [a.id, a]));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Ranking</h1>
        <Link to="/apartment/new" className="btn-primary">+ Add apartment</Link>
      </div>
      {ranked.length === 0 ? (
        <p className="card text-center text-slate-500">No apartments yet. Add the first one you visited.</p>
      ) : (
        <ol className="grid gap-3 sm:grid-cols-2">
          {ranked.map((s, i) => {
            const a = byId.get(s.apartmentId)!;
            const scoredBy = s.totals.filter((t) => t !== null).length;
            return (
              <li key={a.id}>
                <Link to={`/apartment/${a.id}`} className="card flex items-center gap-4 transition hover:border-indigo-300">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-2xl font-bold"
                    style={{ background: scoreColor(s.combined === null ? null : s.combined / 10) }}>
                    {formatTotal(s.combined)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      {s.combined !== null && <span className="text-sm text-slate-400">#{i + 1}</span>}
                      <h2 className="truncate font-semibold">{a.name}</h2>
                    </div>
                    {formatFacts(a) && <p className="text-sm text-slate-500">{formatFacts(a)}</p>}
                    <p className="text-sm text-slate-700">
                      {members.map((m, k) => `${m.display_name} ${formatTotal(s.totals[k])}`).join(' · ')}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {scoredBy === 1 && members.length > 1 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">Only 1 of {members.length} scored</span>}
                      {s.incomplete && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Not fully scored</span>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/pages/Compare.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { useData } from '../lib/data';
import { average, formatTotal, getScore, isDisagreement, rankSummaries, scoreColor, summarize } from '../lib/scoring';
import { formatEuro } from '../lib/format';

const stickyCell = 'sticky left-0 z-10 bg-white p-2 text-left';

export default function Compare() {
  const { apartments, categories, scoreIndex, members } = useData();
  const memberIds = members.map((m) => m.user_id);
  const summaries = rankSummaries(apartments.map((a) => summarize(a.id, categories, scoreIndex, memberIds)));
  const byId = new Map(apartments.map((a) => [a.id, a]));
  const cols = summaries.map((s) => byId.get(s.apartmentId)!);

  if (cols.length === 0) {
    return <p className="card text-center text-slate-500">Add apartments to compare them.</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Compare</h1>
      <p className="mb-3 text-sm text-slate-500">
        Cells show {members.map((m) => m.display_name).join(' / ')}. ⚡ = you disagree by 3+. ×N = category weight.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${stickyCell} font-medium text-slate-500`}>Category</th>
              {cols.map((a) => (
                <th key={a.id} className="min-w-28 p-2 text-center font-semibold">
                  <Link to={`/apartment/${a.id}`} className="hover:underline">{a.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-200">
              <th className={`${stickyCell} font-bold`}>Total</th>
              {summaries.map((s) => (
                <td key={s.apartmentId} className="p-2 text-center" style={{ background: scoreColor(s.combined === null ? null : s.combined / 10) }}>
                  <div className="text-lg font-bold">{formatTotal(s.combined)}</div>
                  <div className="text-xs text-slate-600">{s.totals.map(formatTotal).join(' / ')}</div>
                </td>
              ))}
            </tr>
            <tr className="border-t border-slate-200">
              <th className={`${stickyCell} font-medium`}>Rent</th>
              {cols.map((a) => <td key={a.id} className="p-2 text-center">{formatEuro(a.rent_eur)}</td>)}
            </tr>
            <tr className="border-t border-slate-200">
              <th className={`${stickyCell} font-medium`}>Size</th>
              {cols.map((a) => <td key={a.id} className="p-2 text-center">{a.size_m2 === null ? '—' : `${a.size_m2} m²`}</td>)}
            </tr>
            {categories.map((c) => (
              <tr key={c.id} className={`border-t border-slate-200 ${c.weight === 0 ? 'opacity-50' : ''}`}>
                <th className={`${stickyCell} font-medium`}>
                  {c.name} <span className="text-xs font-normal text-slate-400">×{c.weight}</span>
                </th>
                {cols.map((a) => {
                  const values = memberIds.map((u) => getScore(scoreIndex, a.id, c.id, u));
                  return (
                    <td key={a.id} className="p-2 text-center tabular-nums" style={{ background: scoreColor(average(values)) }}>
                      {values.map((v) => v ?? '–').join(' / ')}{isDisagreement(values) && ' ⚡'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify.** `npm run build` passes. In the dev server, the Ranking empty state shows and "+ Add apartment" navigates.
- [ ] **Step 4: Commit** with message `feat: ranking and compare pages`.

---

### Task 5: Apartment form + apartment page (videos, scoring)

**Files:**
- Create: `src/components/ScoreRow.tsx`, `src/components/VideoEmbed.tsx`
- Modify (replace placeholders): `src/pages/ApartmentForm.tsx`, `src/pages/ApartmentPage.tsx`

**Interfaces:**
- Consumes: `useData`, `toEmbed`, `EMPTY_FORM`/`toForm`/`toInput`/`FormState`, `Field`, scoring helpers, `formatEuro`.

- [ ] **Step 1: Write the components**

`src/components/ScoreRow.tsx`:
```tsx
import { scoreColor } from '../lib/scoring';
import type { Category } from '../lib/types';

type Props = {
  category: Category;
  mine: number | null;
  partnerScore: number | null;
  partnerName?: string;
  onChange: (score: number | null) => void;
};

export default function ScoreRow({ category, mine, partnerScore, partnerName, onChange }: Props) {
  return (
    <li className="py-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="font-medium">
          {category.name}
          <span className="ml-1 text-xs font-normal text-slate-400">×{category.weight}</span>
        </span>
        {partnerName && (
          <span className="text-xs text-slate-500">{partnerName}: <b className="text-slate-800">{partnerScore ?? '–'}</b></span>
        )}
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const selected = mine === n;
          return (
            <button key={n} type="button" aria-pressed={selected}
              onClick={() => onChange(selected ? null : n)}
              className={`h-10 rounded-md text-sm font-semibold tabular-nums ${selected ? 'text-slate-900 ring-2 ring-slate-800' : 'bg-slate-100 text-slate-600'}`}
              style={selected ? { background: scoreColor(n) } : undefined}>
              {n}
            </button>
          );
        })}
      </div>
    </li>
  );
}
```

`src/components/VideoEmbed.tsx`:
```tsx
import { toEmbed } from '../lib/video';

export default function VideoEmbed({ url }: { url: string }) {
  const embed = toEmbed(url);
  if (embed.kind === 'link') {
    return <a href={embed.url} target="_blank" rel="noreferrer" className="break-all text-indigo-600 underline">Open link: {embed.url}</a>;
  }
  return (
    <div className="space-y-1">
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe src={embed.embedUrl} title="Apartment video" className="h-full w-full"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline">Open original</a>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/pages/ApartmentForm.tsx`**

```tsx
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../lib/data';
import { EMPTY_FORM, toForm, toInput, type FormState } from '../lib/apartmentForm';
import Field from '../components/Field';

export default function ApartmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apartments, saveApartment } = useData();
  const existing = id ? apartments.find((a) => a.id === id) : undefined;
  const [form, setForm] = useState<FormState>(() => (existing ? toForm(existing) : EMPTY_FORM));
  const [saving, setSaving] = useState(false);

  if (id && !existing) return <p className="card">Apartment not found. <Link to="/" className="underline">Back</Link></p>;

  const bind = (k: keyof FormState) => ({
    value: form[k],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const savedId = await saveApartment(toInput(form), id);
    setSaving(false);
    if (savedId) navigate(`/apartment/${savedId}`, { replace: true });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">{id ? 'Edit apartment' : 'Add apartment'}</h1>
      <div className="card space-y-4">
        <Field label="Name *"><input className="input" required placeholder="e.g. Sunny 2BR near the park" {...bind('name')} /></Field>
        <Field label="Address"><input className="input" {...bind('address')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rent (€ / month)"><input className="input" type="number" inputMode="decimal" min="0" step="any" {...bind('rent_eur')} /></Field>
          <Field label="Size (m²)"><input className="input" type="number" inputMode="decimal" min="0" step="any" {...bind('size_m2')} /></Field>
          <Field label="Rooms"><input className="input" type="number" inputMode="decimal" min="0" step="0.5" {...bind('rooms')} /></Field>
          <Field label="Floor"><input className="input" {...bind('floor')} /></Field>
        </div>
        <Field label="Listing link"><input className="input" type="url" placeholder="https://…" {...bind('listing_url')} /></Field>
        <Field label="Visited on"><input className="input" type="date" {...bind('visited_on')} /></Field>
      </div>
      <div className="card space-y-4">
        <Field label="Video links (one per line)" hint="Google Drive or YouTube. In Drive: Share → General access → Anyone with the link.">
          <textarea className="input min-h-20" placeholder="https://drive.google.com/file/d/…" {...bind('video_urls')} />
        </Field>
        <Field label="Pros"><textarea className="input min-h-20" {...bind('pros')} /></Field>
        <Field label="Cons"><textarea className="input min-h-20" {...bind('cons')} /></Field>
        <Field label="Notes"><textarea className="input min-h-20" {...bind('notes')} /></Field>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn" onClick={() => navigate(-1)}>Cancel</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Write `src/pages/ApartmentPage.tsx`**

```tsx
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../lib/data';
import { formatTotal, getScore, scoreColor, summarize } from '../lib/scoring';
import { formatEuro } from '../lib/format';
import ScoreRow from '../components/ScoreRow';
import VideoEmbed from '../components/VideoEmbed';

export default function ApartmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apartments, categories, members, me, scoreIndex, setScore, deleteApartment } = useData();
  const a = apartments.find((x) => x.id === id);
  if (!a) return <p className="card">Apartment not found. <Link to="/" className="underline">Back</Link></p>;

  const s = summarize(a.id, categories, scoreIndex, members.map((m) => m.user_id));
  const partner = members.find((m) => m.user_id !== me);
  const facts: [string, string][] = [
    ['Rent', a.rent_eur === null ? '—' : `${formatEuro(a.rent_eur)}/mo`],
    ['Size', a.size_m2 === null ? '—' : `${a.size_m2} m²`],
    ['Rooms', a.rooms === null ? '—' : String(a.rooms)],
    ['Floor', a.floor ?? '—'],
    ['Visited', a.visited_on ?? '—'],
  ];

  async function onDelete() {
    if (!a || !confirm(`Delete "${a.name}"? This also deletes all its scores.`)) return;
    if (await deleteApartment(a.id)) navigate('/', { replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{a.name}</h1>
          {a.address && <p className="text-slate-500">{a.address}</p>}
          <p className="mt-1 text-sm text-slate-700">
            {members.map((m, k) => `${m.display_name}: ${formatTotal(s.totals[k])}`).join(' · ')}
          </p>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-2xl font-bold"
          style={{ background: scoreColor(s.combined === null ? null : s.combined / 10) }}>
          {formatTotal(s.combined)}
        </div>
      </div>

      <section className="card">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k}><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
          {a.listing_url && (
            <div><dt className="text-slate-500">Listing</dt><dd><a href={a.listing_url} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 underline">Open</a></dd></div>
          )}
        </dl>
      </section>

      {a.video_urls.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Videos</h2>
          {a.video_urls.map((u, i) => <VideoEmbed key={i} url={u} />)}
        </section>
      )}

      <section className="card">
        <h2 className="font-semibold">My scores</h2>
        <p className="text-xs text-slate-500">Tap a number to score, tap it again to clear. ×N = category weight.</p>
        <ul className="divide-y divide-slate-100">
          {categories.map((c) => (
            <ScoreRow key={c.id} category={c}
              mine={getScore(scoreIndex, a.id, c.id, me)}
              partnerScore={partner ? getScore(scoreIndex, a.id, c.id, partner.user_id) : null}
              partnerName={partner?.display_name}
              onChange={(v) => setScore(a.id, c.id, v)} />
          ))}
        </ul>
      </section>

      {(a.pros || a.cons || a.notes) && (
        <section className="card grid gap-4 sm:grid-cols-3">
          {([['Pros', a.pros], ['Cons', a.cons], ['Notes', a.notes]] as const).map(([k, v]) => v && (
            <div key={k}><h3 className="text-sm font-semibold text-slate-500">{k}</h3><p className="whitespace-pre-wrap">{v}</p></div>
          ))}
        </section>
      )}

      <div className="flex gap-2">
        <Link to={`/apartment/${a.id}/edit`} className="btn">Edit</Link>
        <button className="btn-danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify.** `npm run build` passes. With the user signed in on the dev server: add an apartment, score it, see it on Ranking.
- [ ] **Step 5: Commit** with message `feat: apartment form and page with videos and scoring`.

---

### Task 6: Categories page

**Files:**
- Modify (replace placeholder): `src/pages/Categories.tsx`

- [ ] **Step 1: Write `src/pages/Categories.tsx`**

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useData } from '../lib/data';
import type { Category } from '../lib/types';

export default function Categories() {
  const { categories, addCategory } = useData();
  const [newName, setNewName] = useState('');

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await addCategory(name);
    setNewName('');
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Categories & weights</h1>
        <p className="text-sm text-slate-500">Weight = how much it matters: 0 = ignore, 5 = crucial. Changes re-rank everything instantly.</p>
      </div>
      <ul className="card divide-y divide-slate-100 p-0">
        {categories.map((c, i) => (
          <CategoryRow key={c.id} category={c} isFirst={i === 0} isLast={i === categories.length - 1} />
        ))}
      </ul>
      <form onSubmit={onAdd} className="flex gap-2">
        <input className="input" placeholder="New category, e.g. Parking" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-primary shrink-0">Add</button>
      </form>
    </div>
  );
}

function CategoryRow({ category, isFirst, isLast }: { category: Category; isFirst: boolean; isLast: boolean }) {
  const { updateCategory, deleteCategory, moveCategory } = useData();
  const [name, setName] = useState(category.name);
  useEffect(() => setName(category.name), [category.name]);

  function commitName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== category.name) updateCategory(category.id, { name: trimmed });
    else setName(category.name);
  }

  return (
    <li className="space-y-2 p-3">
      <div className="flex gap-1.5">
        <input className="input" value={name} aria-label="Category name"
          onChange={(e) => setName(e.target.value)} onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
        <button type="button" className="btn px-2.5" disabled={isFirst} aria-label="Move up" onClick={() => moveCategory(category.id, -1)}>↑</button>
        <button type="button" className="btn px-2.5" disabled={isLast} aria-label="Move down" onClick={() => moveCategory(category.id, 1)}>↓</button>
        <button type="button" className="btn-danger px-2.5" aria-label="Delete"
          onClick={() => { if (confirm(`Delete "${category.name}"? All scores in this category will be deleted.`)) deleteCategory(category.id); }}>✕</button>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-14 text-xs text-slate-500">Weight</span>
        <div className="grid flex-1 grid-cols-6 gap-1">
          {[0, 1, 2, 3, 4, 5].map((w) => (
            <button key={w} type="button" aria-pressed={category.weight === w}
              onClick={() => updateCategory(category.id, { weight: w })}
              className={`h-9 rounded-md text-sm font-semibold ${category.weight === w ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {w}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}
```

- [ ] **Step 2: Verify.** `npm run build` and `npm test` pass. Changing a weight re-orders Ranking.
- [ ] **Step 3: Commit** with message `feat: categories and weights page`.

---

### Task 7: Deploy to GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_KEY: ${{ vars.VITE_SUPABASE_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: USER CHECKPOINT. Confirm repo visibility.** GitHub Pages on a free account needs a **public** repo. The code holds no emails or passwords, and data is protected by RLS.
- [ ] **Step 3: Create the repo and push** (verify `git config user.email` = katzir95@gmail.com first):
```bash
export GH_TOKEN="$(gh auth token --user Yuvalsssssssssss)"
gh repo create Yuvalsssssssssss/rent-a-flat --public --source . --remote origin
gh variable set VITE_SUPABASE_URL --body "https://abwddruuyblozeexfgny.supabase.co" -R Yuvalsssssssssss/rent-a-flat
gh variable set VITE_SUPABASE_KEY --body "sb_publishable_PccZ89MLpcYHGJObLGtM_g_p8ep1L02" -R Yuvalsssssssssss/rent-a-flat
gh api -X POST repos/Yuvalsssssssssss/rent-a-flat/pages -f build_type=workflow
git push -u origin main
gh run watch -R Yuvalsssssssssss/rent-a-flat --exit-status
```
- [ ] **Step 4: Verify.** `curl -s -o /dev/null -w "%{http_code}" https://yuvalsssssssssss.github.io/rent-a-flat/` returns 200, and the user signs in on their phone.
- [ ] **Step 5: Commit** with message `ci: deploy to GitHub Pages`. Do this before the push in Step 3.
