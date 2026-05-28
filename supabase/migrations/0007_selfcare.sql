-- Self-care daily booleans. Each insert sets one column to true.
-- "Done today" = exists any row for the user where logged_for = today and col = true.
-- Run in Supabase SQL editor.

alter table public.entries
  add column if not exists showered      boolean,
  add column if not exists brushed_teeth boolean,
  add column if not exists dressed       boolean,
  add column if not exists ate_meals     boolean;
