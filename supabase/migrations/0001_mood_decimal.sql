-- Widen mood/energy/focus from smallint to numeric(4,2) so the
-- two-decimal slider precision is preserved in storage.
-- Run in Supabase SQL editor.

alter table public.entries
  alter column mood   type numeric(4,2) using mood::numeric,
  alter column energy type numeric(4,2) using energy::numeric,
  alter column focus  type numeric(4,2) using focus::numeric;

alter table public.entries drop constraint if exists entries_mood_check;
alter table public.entries drop constraint if exists entries_energy_check;
alter table public.entries drop constraint if exists entries_focus_check;

alter table public.entries
  add constraint entries_mood_check   check (mood   >= 0 and mood   <= 10),
  add constraint entries_energy_check check (energy >= 0 and energy <= 10),
  add constraint entries_focus_check  check (focus  >= 0 and focus  <= 10);
