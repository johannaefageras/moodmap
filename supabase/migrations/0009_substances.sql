-- Substances: per-insert deltas (typically 1). Today's value = SUM of today's rows.
-- Undo deletes the most recent row for that substance/today.
-- Run in Supabase SQL editor.

alter table public.entries
  add column if not exists caffeine smallint,
  add column if not exists alcohol  smallint,
  add column if not exists nicotine smallint,
  add column if not exists drugs    smallint;

alter table public.entries drop constraint if exists entries_caffeine_check;
alter table public.entries drop constraint if exists entries_alcohol_check;
alter table public.entries drop constraint if exists entries_nicotine_check;
alter table public.entries drop constraint if exists entries_drugs_check;

alter table public.entries
  add constraint entries_caffeine_check
  check (caffeine is null or (caffeine >= 0 and caffeine <= 50)),
  add constraint entries_alcohol_check
  check (alcohol is null or (alcohol >= 0 and alcohol <= 50)),
  add constraint entries_nicotine_check
  check (nicotine is null or (nicotine >= 0 and nicotine <= 50)),
  add constraint entries_drugs_check
  check (drugs is null or (drugs >= 0 and drugs <= 50));
