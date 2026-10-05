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
