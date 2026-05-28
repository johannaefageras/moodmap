import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createSupabaseServerClient } from '#/lib/supabase/server'
import { complete, currentModel } from './client'
import { hashInput, readByHash, readLatest, writeOutput } from './cache'
import { SURFACE_LIMITS, SYSTEM_PREAMBLE } from './prompts'
import { CRISIS_FALLBACK_SV, detectCrisis } from './safety'

const FRESHNESS_MS = 7 * 24 * 60 * 60 * 1000
const MIN_DAYS_WITH_DATA = 7

type DayAggregate = {
  date: string
  mood: number | null
  energy: number | null
  anxiety: number | null
  stress: number | null
  concentration: number | null
  sleep_hours: number | null
  sleep_quality: number | null
  water_glasses: number
  exercise_min: number
  daylight_min: number
  social_count: number
  caffeine: number
  alcohol: number
  notes_count: number
}

type EntryRow = {
  logged_for: string
  mood: number | null
  energy: number | null
  anxiety: number | null
  stress: number | null
  concentration: number | null
  sleep_hours: number | null
  sleep_quality: number | null
  water_glasses: number | null
  exercise_min: number | null
  daylight_min: number | null
  social_relation: string | null
  caffeine: number | null
  alcohol: number | null
  note: string | null
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function avg(values: (number | null | undefined)[]): number | null {
  const xs = values.filter((v): v is number => typeof v === 'number')
  if (xs.length === 0) return null
  return Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1))
}

function thirtyDays(today = new Date()): string[] {
  const out: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    out.push(isoDate(d))
  }
  return out
}

function aggregate(rows: EntryRow[], days: string[]): DayAggregate[] {
  const byDay = new Map<string, EntryRow[]>()
  for (const r of rows) {
    const list = byDay.get(r.logged_for) ?? []
    list.push(r)
    byDay.set(r.logged_for, list)
  }
  return days.map((date) => {
    const rs = byDay.get(date) ?? []
    return {
      date,
      mood: avg(rs.map((r) => r.mood)),
      energy: avg(rs.map((r) => r.energy)),
      anxiety: avg(rs.map((r) => r.anxiety)),
      stress: avg(rs.map((r) => r.stress)),
      concentration: avg(rs.map((r) => r.concentration)),
      sleep_hours: avg(rs.map((r) => r.sleep_hours)),
      sleep_quality: avg(rs.map((r) => r.sleep_quality)),
      water_glasses: rs.reduce((a, r) => a + (r.water_glasses ?? 0), 0),
      exercise_min: rs.reduce((a, r) => a + (r.exercise_min ?? 0), 0),
      daylight_min: rs.reduce((a, r) => a + (r.daylight_min ?? 0), 0),
      social_count: rs.filter((r) => r.social_relation !== null).length,
      caffeine: rs.reduce((a, r) => a + (r.caffeine ?? 0), 0),
      alcohol: rs.reduce((a, r) => a + (r.alcohol ?? 0), 0),
      notes_count: rs.filter((r) => !!r.note?.trim()).length,
    }
  })
}

function buildUserPrompt(days: DayAggregate[]): string {
  return [
    'Här är 30 dagar av loggad data (tomma fält = inget loggat den dagen).',
    '',
    'Skriv EN enda mening på svenska som lyfter ett möjligt mönster eller samband du ser. Använd hedgande språk ("Det verkar som att…", "Det kan finnas ett samband mellan…", "Kanske…"). Aldrig tvärsäkert. Påstå inga orsaker — bara samband. Hitta inte på siffror.',
    '',
    'Om underlaget är för tunt eller mönstret är oklart, skriv en mjuk mening om det istället (t.ex. "Det är ännu lite tidigt för att se ett tydligt mönster.").',
    '',
    'Data (JSON):',
    JSON.stringify(days, null, 2),
  ].join('\n')
}

export type PatternResult = {
  content: string
  model: string
  generated_at: string
  source: 'cache' | 'fresh' | 'crisis' | 'static'
}

const inputValidator = z.object({ force: z.boolean().optional() }).optional()

export const getPatternObservation = createServerFn({ method: 'POST' })
  .inputValidator(inputValidator)
  .handler(async ({ data }): Promise<PatternResult> => {
    const force = data?.force === true
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    if (!force) {
      const latest = await readLatest(supabase, user.id, 'pattern')
      if (latest && Date.now() - new Date(latest.generated_at).getTime() < FRESHNESS_MS) {
        return {
          content: latest.content,
          model: latest.model,
          generated_at: latest.generated_at,
          source: 'cache',
        }
      }
    }

    const days = thirtyDays()
    const rangeStart = days[0]
    const rangeEnd = days[days.length - 1]

    const { data: rows, error } = await supabase
      .from('entries')
      .select(
        'logged_for, mood, energy, anxiety, stress, concentration, sleep_hours, sleep_quality, water_glasses, exercise_min, daylight_min, social_relation, caffeine, alcohol, note',
      )
      .eq('user_id', user.id)
      .gte('logged_for', rangeStart)
      .lte('logged_for', rangeEnd)
      .order('logged_for', { ascending: true })

    if (error) throw new Error(error.message)
    const aggregated = aggregate((rows as EntryRow[]) ?? [], days)
    const inputHash = hashInput({ kind: 'pattern', range: [rangeStart, rangeEnd], days: aggregated })

    if (!force) {
      const cached = await readByHash(supabase, user.id, 'pattern', inputHash)
      if (cached) {
        return {
          content: cached.content,
          model: cached.model,
          generated_at: cached.generated_at,
          source: 'cache',
        }
      }
    }

    const daysWithData = aggregated.filter(
      (d) =>
        d.mood !== null ||
        d.energy !== null ||
        d.anxiety !== null ||
        d.stress !== null ||
        d.sleep_hours !== null,
    ).length

    if (daysWithData < MIN_DAYS_WITH_DATA) {
      const fallback = 'Det är ännu lite tidigt för att se ett tydligt mönster — fortsätt logga så börjar något framträda.'
      const saved = await writeOutput(supabase, user.id, 'pattern', inputHash, fallback, 'static-fallback')
      return {
        content: saved.content,
        model: saved.model,
        generated_at: saved.generated_at,
        source: 'static',
      }
    }

    const content = await complete({
      messages: [
        { role: 'system', content: SYSTEM_PREAMBLE },
        { role: 'user', content: buildUserPrompt(aggregated) },
      ],
      maxOutputTokens: SURFACE_LIMITS.pattern.maxTokens,
      reasoningEffort: 'minimal',
    })

    if (detectCrisis(content)) {
      const saved = await writeOutput(supabase, user.id, 'pattern', inputHash, CRISIS_FALLBACK_SV, 'crisis-fallback')
      return {
        content: saved.content,
        model: saved.model,
        generated_at: saved.generated_at,
        source: 'crisis',
      }
    }

    const saved = await writeOutput(supabase, user.id, 'pattern', inputHash, content, currentModel())
    return {
      content: saved.content,
      model: saved.model,
      generated_at: saved.generated_at,
      source: 'fresh',
    }
  })
