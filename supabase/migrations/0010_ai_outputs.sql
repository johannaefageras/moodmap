-- AI-generated outputs cache. Keyed by (user_id, kind, input_hash) so we
-- can return cached text when the inputs haven't changed. One row per
-- generation; the latest by generated_at is the current value.
-- Run in Supabase SQL editor.

create table if not exists public.ai_outputs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('summary', 'pattern', 'journal_prompt', 'reframe')),
  input_hash   text not null,
  content      text not null,
  model        text not null,
  generated_at timestamptz not null default now()
);

create index if not exists ai_outputs_user_kind_idx
  on public.ai_outputs (user_id, kind, generated_at desc);

create index if not exists ai_outputs_lookup_idx
  on public.ai_outputs (user_id, kind, input_hash, generated_at desc);

alter table public.ai_outputs enable row level security;

drop policy if exists "Users read own ai_outputs"   on public.ai_outputs;
drop policy if exists "Users insert own ai_outputs" on public.ai_outputs;
drop policy if exists "Users delete own ai_outputs" on public.ai_outputs;

create policy "Users read own ai_outputs"
  on public.ai_outputs for select
  using (auth.uid() = user_id);

create policy "Users insert own ai_outputs"
  on public.ai_outputs for insert
  with check (auth.uid() = user_id);

create policy "Users delete own ai_outputs"
  on public.ai_outputs for delete
  using (auth.uid() = user_id);
