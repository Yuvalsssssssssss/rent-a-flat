# rent-a-flat — Design

**Date:** 2026-10-05
**Status:** Approved

## Purpose

A free, simple, mobile-first web app that helps two people decide which apartment to rent. They visit apartments over time, score each one per category on their own, and the app ranks and compares all apartments using one shared set of category weights.

## Users and access

- Two people, each with their own login (Supabase email magic link). Sessions persist per device.
- Data syncs across all devices (phone and computer).
- Only two allowlisted email addresses can read or write data. This is enforced server-side with Supabase Row Level Security. Anyone else sees only the sign-in screen.
- UI language: English (notes may be typed in any language). Currency: EUR (€).

## Screens

1. **Sign in.** The user enters an email and receives a magic link.
2. **Ranking (home).** Apartment cards sorted by combined score, highest first. Each card shows:
   - combined score (0–100), my total, and partner's total
   - rent €, m², rooms
   - an "incomplete" badge if either person has unscored categories
   - an "+ Add apartment" button
3. **Compare.** A table with categories as rows and apartments as columns. Each cell shows both people's scores, colored red→green by their average. Cells where the two scores differ by ≥ 3 are flagged as a disagreement. Weights are shown next to category names. On mobile the table scrolls horizontally inside its container, and the category column stays sticky.
4. **Apartment page.**
   - Facts: name, address, rent €, size m², rooms, floor, listing URL, visit date.
   - Videos: a list of Google Drive / YouTube links rendered as embedded players. Unrecognised links fall back to a plain "Open link".
   - Notes, pros, cons (free text).
   - My scores: a 1–10 slider per category, with partner's score shown beside it. Scores save on change.
   - Edit and delete apartment (delete asks for confirmation).
5. **Categories & weights.** Add, rename, reorder and delete categories, and set a weight from 0 to 5. Deleting a category asks for confirmation and removes its scores. Default categories are seeded on first run: Location, View, Size & layout, Balcony / outdoor, Price, Natural light, Kitchen, Quiet, Condition, Building & area (all weight 3).

## Scoring

- Scores are integers 1–10. Weights are integers 0–5.
- **Person total** for an apartment = Σ(weight × score) / Σ(weight) × 10, over the categories that person has scored and whose weight is > 0. The result is 0–100, rounded to an integer for display. If the person has scored nothing (or Σweight = 0), the total is "—".
- **Combined score** = the mean of the available person totals (one or two). If only one person has scored, this is labelled on the card.
- **Ranking** sorts by combined score descending. Apartments with no scores go last.
- Changing a weight recalculates everything immediately.
- An apartment is **incomplete** when either person lacks a score for any category with weight > 0.

## Videos

- The user uploads the video to Google Drive, shares it as "Anyone with the link", and pastes the link.
- Drive links `drive.google.com/file/d/<ID>/...` become `https://drive.google.com/file/d/<ID>/preview` in an iframe.
- YouTube links (`youtube.com/watch?v=<ID>`, `youtu.be/<ID>`, `youtube.com/shorts/<ID>`) become `https://www.youtube.com/embed/<ID>`.
- A tip next to the input reminds the user about Drive sharing.

## Technical

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, client-side routing with a hash router (needed for GitHub Pages).
- **Backend:** Supabase (Postgres + Auth), accessed directly from the browser with `@supabase/supabase-js` and the public anon key.
- **Hosting:** GitHub Pages in the repo `Yuvalsssssssssss/rent-a-flat`, deployed by GitHub Actions on every push to `main`. The Supabase URL and anon key are passed at build time as GitHub Actions variables. The anon key is public by design; security comes from RLS.

### Data model

| Table | Columns |
|---|---|
| `categories` | `id` uuid pk, `name` text, `weight` int 0–5, `position` int, `created_at` |
| `apartments` | `id` uuid pk, `name` text, `address` text, `rent_eur` numeric, `size_m2` numeric, `rooms` numeric, `floor` text, `listing_url` text, `visited_on` date, `video_urls` text[], `notes` text, `pros` text, `cons` text, `created_at` |
| `scores` | `apartment_id` fk → apartments (cascade), `category_id` fk → categories (cascade), `user_id` uuid → auth.users, `score` int 1–10, `updated_at`; pk (`apartment_id`, `category_id`, `user_id`) |

- An `allowed_emails` table (`email` pk, `display_name` text) supplies the names shown in the UI (e.g. "Yuval" vs partner). It, plus RLS policies on all tables permit access only when `auth.jwt() ->> 'email'` is in the allowlist.
- Users may write only their own `scores` rows. Both users may read and write everything else.
- Supabase Auth redirect URLs must include the GitHub Pages URL and `http://localhost:5173`.
- The schema ships as a SQL file in the repo (`supabase/schema.sql`) and is run once in the Supabase SQL editor.

### Errors

- Failed saves show a visible error toast and keep the user's input.
- If loading fails, the screen shows a retry option.

### Testing

- Unit tests (Vitest) for the scoring math and the video-link parsing.
- Manual check of every screen at phone width (~390px) and desktop width before calling the work done.

## Scope

- **Tonight:** everything above, deployed and usable on a phone.
- **Later (not now):** photos, map, charts (e.g. a radar per apartment), PWA/home-screen icon, visual polish.
