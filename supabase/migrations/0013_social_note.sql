-- Add a free-text social note for the combined check-in form.
-- Run in Supabase SQL editor.

alter table public.entries
  add column if not exists social_note text;
