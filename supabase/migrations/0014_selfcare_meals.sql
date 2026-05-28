-- More self-care daily booleans and per-meal tracking.
-- Same pattern as 0007: each insert sets one column to true.
-- "Done today" = exists any row for the user where logged_for = today and col = true.
-- Run in Supabase SQL editor.

alter table public.entries
  add column if not exists medication    boolean,
  add column if not exists screen_free   boolean,
  add column if not exists recovery      boolean,
  add column if not exists ate_breakfast boolean,
  add column if not exists ate_lunch     boolean,
  add column if not exists ate_dinner    boolean;
