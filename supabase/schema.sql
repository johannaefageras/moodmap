-- moodmap initial schema
-- Run this in Supabase SQL editor (Dashboard → SQL → New query → paste → Run).

-- Entries: one row per check-in (a user can have multiple entries per day for now).
create table if not exists public.entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  logged_for   date not null default current_date,
  mood         numeric(4,2) check (mood >= 0 and mood <= 10),
  energy       numeric(4,2) check (energy >= 0 and energy <= 10),
  concentration numeric(4,2) check (concentration >= 0 and concentration <= 10),
  anxiety      numeric(4,2) check (anxiety >= 0 and anxiety <= 10),
  stress       numeric(4,2) check (stress >= 0 and stress <= 10),
  sleep_hours   numeric(3,1) check (sleep_hours >= 0 and sleep_hours <= 24),
  sleep_quality numeric(4,2) check (sleep_quality >= 0 and sleep_quality <= 10),
  water_glasses smallint check (water_glasses is null or (water_glasses >= 0 and water_glasses <= 50)),
  exercise_min  smallint check (exercise_min  is null or (exercise_min  >= 0 and exercise_min  <= 1440)),
  outdoors_min  smallint check (outdoors_min  is null or (outdoors_min  >= 0 and outdoors_min  <= 1440)),
  daylight_min  smallint check (daylight_min  is null or (daylight_min  >= 0 and daylight_min  <= 1440)),
  showered      boolean,
  brushed_teeth boolean,
  dressed       boolean,
  ate_meals     boolean,
  medication    boolean,
  screen_free   boolean,
  recovery      boolean,
  ate_breakfast boolean,
  ate_lunch     boolean,
  ate_dinner    boolean,
  social_relation text check (social_relation is null or social_relation in ('family','friend','colleague','stranger','partner','neighbor','pet','care','online')),
  caffeine      smallint check (caffeine is null or (caffeine >= 0 and caffeine <= 50)),
  alcohol       smallint check (alcohol  is null or (alcohol  >= 0 and alcohol  <= 50)),
  nicotine      smallint check (nicotine is null or (nicotine >= 0 and nicotine <= 50)),
  drugs         smallint check (drugs    is null or (drugs    >= 0 and drugs    <= 50)),
  note          text
);

create index if not exists entries_user_logged_idx
  on public.entries (user_id, logged_for desc);

-- Row-level security: each user can only see/modify their own entries.
alter table public.entries enable row level security;

drop policy if exists "Users read own entries"   on public.entries;
drop policy if exists "Users insert own entries" on public.entries;
drop policy if exists "Users update own entries" on public.entries;
drop policy if exists "Users delete own entries" on public.entries;

create policy "Users read own entries"
  on public.entries for select
  using (auth.uid() = user_id);

create policy "Users insert own entries"
  on public.entries for insert
  with check (auth.uid() = user_id);

create policy "Users update own entries"
  on public.entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own entries"
  on public.entries for delete
  using (auth.uid() = user_id);
