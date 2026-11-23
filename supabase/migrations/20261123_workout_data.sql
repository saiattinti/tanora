-- Tanora Beta 2.0: new workout-only storage. Does not alter nutrition tables.
-- Run once in your Supabase SQL Editor before testing signed-in workout syncing.
create table if not exists public.workout_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"history":[],"routines":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workout_data enable row level security;

drop policy if exists "Users can read their workouts" on public.workout_data;
create policy "Users can read their workouts"
on public.workout_data for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their workouts" on public.workout_data;
create policy "Users can insert their workouts"
on public.workout_data for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their workouts" on public.workout_data;
create policy "Users can update their workouts"
on public.workout_data for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- No delete policy needed: users remove workouts from their own JSON document.
-- Access to workout_data is limited to authenticated users with the matching user ID.
