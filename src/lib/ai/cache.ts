import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Surface } from './prompts'

export function hashInput(payload: unknown): string {
  const json = JSON.stringify(payload)
  return createHash('sha256').update(json).digest('hex')
}

export type CachedOutput = {
  content: string
  model: string
  generated_at: string
  input_hash: string
}

export async function readLatest(
  supabase: SupabaseClient,
  userId: string,
  kind: Surface,
): Promise<CachedOutput | null> {
  const { data, error } = await supabase
    .from('ai_outputs')
    .select('content, model, generated_at, input_hash')
    .eq('user_id', userId)
    .eq('kind', kind)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function readByHash(
  supabase: SupabaseClient,
  userId: string,
  kind: Surface,
  inputHash: string,
): Promise<CachedOutput | null> {
  const { data, error } = await supabase
    .from('ai_outputs')
    .select('content, model, generated_at, input_hash')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('input_hash', inputHash)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function writeOutput(
  supabase: SupabaseClient,
  userId: string,
  kind: Surface,
  inputHash: string,
  content: string,
  model: string,
): Promise<CachedOutput> {
  const { data, error } = await supabase
    .from('ai_outputs')
    .insert({ user_id: userId, kind, input_hash: inputHash, content, model })
    .select('content, model, generated_at, input_hash')
    .single()
  if (error) throw new Error(error.message)
  return data
}
