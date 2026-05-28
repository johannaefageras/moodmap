import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createSupabaseServerClient } from '#/lib/supabase/server'
import { complete, currentModel } from '#/lib/ai/client'
import { hashInput, readByHash, readLatest, writeOutput } from '#/lib/ai/cache'
import { SURFACE_LIMITS, SYSTEM_PREAMBLE } from '#/lib/ai/prompts'
import { CRISIS_FALLBACK_SV, detectCrisis } from '#/lib/ai/safety'
import {
  computeCorrelations,
  correlationFacts,
  type Correlation,
  type CorrelationsPayload,
  type DayInput,
  strengthBucket,
} from './correlations'

const FRESHNESS_MS = 7 * 24 * 60 * 60 * 1000
const WINDOW_DAYS = 60

type EntryRow = {
  logged_for: string
  mood: number | null
  energy: number | null
  concentration: number | null
  anxiety: number | null
  stress: number | null
  sleep_hours: number | null
  sleep_quality: number | null
  water_glasses: number | null
  exercise_min: number | null
  daylight_min: number | null
  social_relation: string | null
  caffeine: number | null
  alcohol: number | null
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function avg(values: (number | null | undefined)[]): number | null {
  const xs = values.filter((v): v is number => typeof v === 'number')
  if (xs.length === 0) return null
  return Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2))
}

function windowDays(count: number, today = new Date()): string[] {
  const out: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    out.push(isoDate(d))
  }
  return out
}

// Days with zero entries → all fields null (so missing days are skipped pairwise).
// Days with entries → rated metrics averaged (or null), counts/sums computed (0 allowed).
function aggregate(rows: EntryRow[], days: string[]): DayInput[] {
  const byDay = new Map<string, EntryRow[]>()
  for (const r of rows) {
    const list = byDay.get(r.logged_for) ?? []
    list.push(r)
    byDay.set(r.logged_for, list)
  }
  return days.map((date) => {
    const rs = byDay.get(date)
    if (!rs || rs.length === 0) {
      return {
        date,
        mood: null,
        energy: null,
        concentration: null,
        anxiety: null,
        stress: null,
        sleep_hours: null,
        sleep_quality: null,
        water: null,
        exercise: null,
        daylight: null,
        social: null,
        caffeine: null,
        alcohol: null,
      }
    }
    return {
      date,
      mood: avg(rs.map((r) => r.mood)),
      energy: avg(rs.map((r) => r.energy)),
      concentration: avg(rs.map((r) => r.concentration)),
      anxiety: avg(rs.map((r) => r.anxiety)),
      stress: avg(rs.map((r) => r.stress)),
      sleep_hours: avg(rs.map((r) => r.sleep_hours)),
      sleep_quality: avg(rs.map((r) => r.sleep_quality)),
      water: rs.reduce((a, r) => a + (r.water_glasses ?? 0), 0),
      exercise: rs.reduce((a, r) => a + (r.exercise_min ?? 0), 0),
      daylight: rs.reduce((a, r) => a + (r.daylight_min ?? 0), 0),
      social: rs.filter((r) => r.social_relation !== null).length,
      caffeine: rs.reduce((a, r) => a + (r.caffeine ?? 0), 0),
      alcohol: rs.reduce((a, r) => a + (r.alcohol ?? 0), 0),
    }
  })
}

function buildUserPrompt(facts: string, count: number): string {
  return [
    'Nedan är numrerade samband som har räknats fram statistiskt i användarens egen data de senaste veckorna.',
    '',
    `Svara med ENBART giltig JSON, inget annat, på formen:`,
    `{"intro": "...", "sentences": ["...", ...]}`,
    '',
    `- "intro": en kort, varm mening på svenska som ramar in att detta är mjuka mönster, inte sanningar.`,
    `- "sentences": exakt ${count} meningar, en per numrerat samband i samma ordning. Varje mening är kort, mjuk och hedgande ("Det verkar som att…", "Det kan finnas ett samband mellan…").`,
    '',
    'Påstå aldrig orsak — bara samvariation. Hitta inte på något som inte står i listan, och nämn inga siffror.',
    '',
    'Samband:',
    facts,
  ].join('\n')
}

function parseSentences(raw: string, count: number): { intro: string; sentences: string[] } | null {
  // Tolerate fenced code blocks or stray prose around the JSON.
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as { intro?: unknown; sentences?: unknown }
    const intro = typeof parsed.intro === 'string' ? parsed.intro.trim() : ''
    const sentences = Array.isArray(parsed.sentences)
      ? parsed.sentences.filter((s): s is string => typeof s === 'string').map((s) => s.trim())
      : []
    if (!intro || sentences.length < count) return null
    return { intro, sentences: sentences.slice(0, count) }
  } catch {
    return null
  }
}

function toView(c: Correlation, text: string): CorrelationsPayload['items'][number] {
  return {
    a: c.a,
    b: c.b,
    lag: c.lag,
    direction: c.direction,
    strength: strengthBucket(c.r),
    rAbs: Math.min(1, Math.abs(c.r)),
    text,
  }
}

export type CorrelationResult = {
  content: string
  model: string
  generated_at: string
  source: 'cache' | 'fresh' | 'crisis' | 'static'
}

const inputValidator = z.object({ force: z.boolean().optional() }).optional()

export const getCorrelations = createServerFn({ method: 'POST' })
  .inputValidator(inputValidator)
  .handler(async ({ data }): Promise<CorrelationResult> => {
    const force = data?.force === true
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    if (!force) {
      const latest = await readLatest(supabase, user.id, 'correlations')
      if (latest && Date.now() - new Date(latest.generated_at).getTime() < FRESHNESS_MS) {
        return {
          content: latest.content,
          model: latest.model,
          generated_at: latest.generated_at,
          source: 'cache',
        }
      }
    }

    const days = windowDays(WINDOW_DAYS)
    const rangeStart = days[0]
    const rangeEnd = days[days.length - 1]

    const { data: rows, error } = await supabase
      .from('entries')
      .select(
        'logged_for, mood, energy, concentration, anxiety, stress, sleep_hours, sleep_quality, water_glasses, exercise_min, daylight_min, social_relation, caffeine, alcohol',
      )
      .eq('user_id', user.id)
      .gte('logged_for', rangeStart)
      .lte('logged_for', rangeEnd)
      .order('logged_for', { ascending: true })

    if (error) throw new Error(error.message)

    const aggregated = aggregate((rows as EntryRow[]) ?? [], days)
    const correlations = computeCorrelations(aggregated)
    const inputHash = hashInput({ kind: 'correlations', range: [rangeStart, rangeEnd], correlations })

    if (!force) {
      const cached = await readByHash(supabase, user.id, 'correlations', inputHash)
      if (cached) {
        return {
          content: cached.content,
          model: cached.model,
          generated_at: cached.generated_at,
          source: 'cache',
        }
      }
    }

    if (correlations.length === 0) {
      const payload: CorrelationsPayload = {
        intro: 'Det är ännu lite tidigt för att se tydliga samband — fortsätt logga så börjar något framträda.',
        items: [],
      }
      const saved = await writeOutput(
        supabase,
        user.id,
        'correlations',
        inputHash,
        JSON.stringify(payload),
        'static-fallback',
      )
      return {
        content: saved.content,
        model: saved.model,
        generated_at: saved.generated_at,
        source: 'static',
      }
    }

    const raw = await complete({
      messages: [
        { role: 'system', content: SYSTEM_PREAMBLE },
        { role: 'user', content: buildUserPrompt(correlationFacts(correlations), correlations.length) },
      ],
      maxOutputTokens: SURFACE_LIMITS.correlations.maxTokens,
      reasoningEffort: 'minimal',
    })

    const parsed = parseSentences(raw, correlations.length)
    if (!parsed) throw new Error('Kunde inte tolka svaret från modellen.')

    if (detectCrisis(`${parsed.intro}\n${parsed.sentences.join('\n')}`)) {
      const payload: CorrelationsPayload = { intro: CRISIS_FALLBACK_SV, items: [] }
      const saved = await writeOutput(
        supabase,
        user.id,
        'correlations',
        inputHash,
        JSON.stringify(payload),
        'crisis-fallback',
      )
      return {
        content: saved.content,
        model: saved.model,
        generated_at: saved.generated_at,
        source: 'crisis',
      }
    }

    const payload: CorrelationsPayload = {
      intro: parsed.intro,
      items: correlations.map((c, i) => toView(c, parsed.sentences[i])),
    }
    const saved = await writeOutput(
      supabase,
      user.id,
      'correlations',
      inputHash,
      JSON.stringify(payload),
      currentModel(),
    )
    return {
      content: saved.content,
      model: saved.model,
      generated_at: saved.generated_at,
      source: 'fresh',
    }
  })
