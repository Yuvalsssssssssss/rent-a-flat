-- Map: apartment coordinates + key places. Run once in the Supabase SQL editor.
alter table public.apartments
  add column lat double precision,
  add column lng double precision;

create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '📍',
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

alter table public.places enable row level security;
create policy "members all" on public.places for all to authenticated using (public.is_allowed()) with check (public.is_allowed());
grant select, insert, update, delete on public.places to authenticated;

insert into public.places (name, emoji, lat, lng) values
  ('Beach', '🏖️', 41.1764840, -8.6930137),
  ('Metro Matosinhos Sul', '🚇', 41.1801219, -8.6885901),
  ('Market', '🛒', 41.1869987, -8.6930991);
