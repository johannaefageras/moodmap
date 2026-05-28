-- Allow the 'correlations' AI surface (insights page) in ai_outputs.kind.
-- Run in Supabase SQL editor.

alter table public.ai_outputs
  drop constraint if exists ai_outputs_kind_check;

alter table public.ai_outputs
  add constraint ai_outputs_kind_check
  check (kind in ('summary', 'pattern', 'journal_prompt', 'reframe', 'correlations'));
