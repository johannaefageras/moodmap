-- Add stress column (0-10, two decimals). Run in Supabase SQL editor.

alter table public.entries
  add column if not exists stress numeric(4,2);

alter table public.entries drop constraint if exists entries_stress_check;

alter table public.entries
  add constraint entries_stress_check
  check (stress is null or (stress >= 0 and stress <= 10));
