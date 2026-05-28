-- Add concentration column (0-10, two decimals). Run in Supabase SQL editor.
-- Replaces the unused `focus` column conceptually; `focus` is left in place
-- but no longer written to. Drop it in a later migration if confirmed unused.

alter table public.entries
  add column if not exists concentration numeric(4,2);

alter table public.entries drop constraint if exists entries_concentration_check;

alter table public.entries
  add constraint entries_concentration_check
  check (concentration is null or (concentration >= 0 and concentration <= 10));
