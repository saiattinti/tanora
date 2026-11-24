-- Tanora Beta 2.1.3: additive nutrition convenience storage.
-- Run in Supabase SQL Editor only AFTER review and BEFORE preview testing.
-- No existing food log, favorite, workout, or goal is deleted or rewritten.

alter table public.food_entries
  add column if not exists eaten_at timestamptz;

create table if not exists public.saved_meals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  items jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists saved_meals_user_idx on public.saved_meals(user_id);
alter table public.saved_meals enable row level security;

drop policy if exists "Own saved meals read" on public.saved_meals;
create policy "Own saved meals read" on public.saved_meals
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Own saved meals insert" on public.saved_meals;
create policy "Own saved meals insert" on public.saved_meals
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Own saved meals update" on public.saved_meals;
create policy "Own saved meals update" on public.saved_meals
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Own saved meals delete" on public.saved_meals;
create policy "Own saved meals delete" on public.saved_meals
  for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.saved_recipes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  ingredients jsonb not null,
  yield_grams numeric not null check (yield_grams > 0),
  portions numeric not null check (portions > 0),
  updated_at timestamptz not null default now()
);

create index if not exists saved_recipes_user_idx on public.saved_recipes(user_id);
alter table public.saved_recipes enable row level security;

drop policy if exists "Own recipes read" on public.saved_recipes;
create policy "Own recipes read" on public.saved_recipes
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Own recipes insert" on public.saved_recipes;
create policy "Own recipes insert" on public.saved_recipes
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Own recipes update" on public.saved_recipes;
create policy "Own recipes update" on public.saved_recipes
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Own recipes delete" on public.saved_recipes;
create policy "Own recipes delete" on public.saved_recipes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- For new tables, grant only signed-in roles via Supabase PostgREST.
grant select, insert, update, delete on public.saved_meals, public.saved_recipes to authenticated;
revoke all on public.saved_meals, public.saved_recipes from anon;

-- Existing food_entries RLS continues to protect the new nullable eaten_at column.
