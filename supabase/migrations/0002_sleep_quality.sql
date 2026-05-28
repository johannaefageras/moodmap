-- Add sleep_quality (0-10, two decimals) alongside the existing
-- sleep_hours column. Run in Supabase SQL editor.

alter table public.entries
  add column if not exists sleep_quality numeric(4,2);

alter table public.entries drop constraint if exists entries_sleep_quality_check;

alter table public.entries
  add constraint entries_sleep_quality_check
  check (sleep_quality is null or (sleep_quality >= 0 and sleep_quality <= 10));
