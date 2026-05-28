-- Social interactions: one row per logged interaction, tagged by relation.
-- "Today" = count of rows for the user where logged_for = today and social_relation is not null.
-- Run in Supabase SQL editor.

alter table public.entries
  add column if not exists social_relation text;

alter table public.entries drop constraint if exists entries_social_relation_check;

alter table public.entries
  add constraint entries_social_relation_check
  check (social_relation is null or social_relation in ('family','friend','colleague','stranger'));
