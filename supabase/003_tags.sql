-- Apartment tags (visited / negotiating / rejected). Run once in the Supabase SQL editor.
alter table public.apartments add column tags text[] not null default '{}';
