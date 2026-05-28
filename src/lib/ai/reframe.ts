import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createSupabaseServerClient } from '#/lib/supabase/server'
import { complete, currentModel } from './client'
import { hashInput, readByHash, writeOutput } from './cache'
import { SURFACE_LIMITS, SYSTEM_PREAMBLE } from './prompts'
import { CRISIS_FALLBACK_SV, detectCrisis } from './safety'

const inputValidator = z.object({
  note: z.string().trim().min(1).max(280),
})

export type ReframeResult = {
  content: string
  model: string
  generated_at: string
  source: 'cache' | 'fresh' | 'crisis'
}

export const getReframe = createServerFn({ method: 'POST' })
  .inputValidator(inputValidator)
  .handler(async ({ data }): Promise<ReframeResult> => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    const inputHash = hashInput({ kind: 'reframe', note: data.note })
    const cached = await readByHash(supabase, user.id, 'reframe', inputHash)
    if (cached) {
      return {
        content: cached.content,
        model: cached.model,
        generated_at: cached.generated_at,
        source: 'cache',
      }
    }

    if (detectCrisis(data.note)) {
      const saved = await writeOutput(
        supabase,
        user.id,
        'reframe',
        inputHash,
        CRISIS_FALLBACK_SV,
        'crisis-fallback',
      )
      return {
        content: saved.content,
        model: saved.model,
        generated_at: saved.generated_at,
        source: 'crisis',
      }
    }

    const userPrompt = [
      'Användaren har skrivit en kort anteckning om sig själv som låter självkritisk.',
      'Skriv ett mjukare sätt att se på det. Exakt 2 meningar, på svenska.',
      'Börja med exakt frasen "Ett annat sätt att se det:".',
      'Bekräfta först att känslan är giltig. Mjuka upp sen — inga råd, inga uppmaningar, inga "borde".',
      '',
      `Anteckning: "${data.note}"`,
    ].join('\n')

    const content = await complete({
      messages: [
        { role: 'system', content: SYSTEM_PREAMBLE },
        { role: 'user', content: userPrompt },
      ],
      maxOutputTokens: SURFACE_LIMITS.reframe.maxTokens,
      reasoningEffort: 'minimal',
    })

    if (detectCrisis(content)) {
      const saved = await writeOutput(
        supabase,
        user.id,
        'reframe',
        inputHash,
        CRISIS_FALLBACK_SV,
        'crisis-fallback',
      )
      return {
        content: saved.content,
        model: saved.model,
        generated_at: saved.generated_at,
        source: 'crisis',
      }
    }

    const saved = await writeOutput(supabase, user.id, 'reframe', inputHash, content, currentModel())
    return {
      content: saved.content,
      model: saved.model,
      generated_at: saved.generated_at,
      source: 'fresh',
    }
  })
