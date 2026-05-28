-- Add anxiety column (0-10, two decimals). Run in Supabase SQL editor.

alter table public.entries
  add column if not exists anxiety numeric(4,2);

alter table public.entries drop constraint if exists entries_anxiety_check;

alter table public.entries
  add constraint entries_anxiety_check
  check (anxiety is null or (anxiety >= 0 and anxiety <= 10));
