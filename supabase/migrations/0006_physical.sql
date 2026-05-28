-- Physical metrics: water (glasses), exercise/outdoors/daylight (minutes).
-- Each insert is a delta; today's value = SUM of today's rows for that column.
-- Run in Supabase SQL editor.

alter table public.entries
  add column if not exists water_glasses smallint,
  add column if not exists exercise_min  smallint,
  add column if not exists outdoors_min  smallint,
  add column if not exists daylight_min  smallint;

alter table public.entries drop constraint if exists entries_water_glasses_check;
alter table public.entries drop constraint if exists entries_exercise_min_check;
alter table public.entries drop constraint if exists entries_outdoors_min_check;
alter table public.entries drop constraint if exists entries_daylight_min_check;

alter table public.entries
  add constraint entries_water_glasses_check
  check (water_glasses is null or (water_glasses >= 0 and water_glasses <= 50)),
  add constraint entries_exercise_min_check
  check (exercise_min is null or (exercise_min >= 0 and exercise_min <= 1440)),
  add constraint entries_outdoors_min_check
  check (outdoors_min is null or (outdoors_min >= 0 and outdoors_min <= 1440)),
  add constraint entries_daylight_min_check
  check (daylight_min is null or (daylight_min >= 0 and daylight_min <= 1440));
