-- Expand allowed social_relation values with partner, neighbor, pet, care, online.
-- Run in Supabase SQL editor.

alter table public.entries drop constraint if exists entries_social_relation_check;

alter table public.entries
  add constraint entries_social_relation_check
  check (social_relation is null or social_relation in (
    'family','friend','colleague','stranger','partner','neighbor','pet','care','online'
  ));
