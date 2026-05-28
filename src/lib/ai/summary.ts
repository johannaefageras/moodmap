import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createSupabaseServerClient } from '#/lib/supabase/server'
import { complete, currentModel } from './client'
import { hashInput, readByHash, readLatest, writeOutput } from './cache'
import { SURFACE_LIMITS, SYSTEM_PREAMBLE } from './prompts'
import { CRISIS_FALLBACK_SV, detectCrisis } from './safety'

const FRESHNESS_MS = 24 * 60 * 60 * 1000

type DaySummary = {
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
  showered: boolean
  brushed_teeth: boolean
  dressed: boolean
  ate_meals: boolean
  social_count: number
  caffeine: number
  alcohol: number
  nicotine: number
  drugs: number
  notes: string[]
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
  showered: boolean | null
  brushed_teeth: boolean | null
  dressed: boolean | null
  ate_meals: boolean | null
  social_relation: string | null
  caffeine: number | null
  alcohol: number | null
  nicotine: number | null
  drugs: number | null
  note: string | null
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function emptyDay(date: string): DaySummary {
  return {
    date,
    mood: null,
    energy: null,
    anxiety: null,
    stress: null,
    concentration: null,
    sleep_hours: null,
    sleep_quality: null,
    water_glasses: 0,
    exercise_min: 0,
    daylight_min: 0,
    showered: false,
    brushed_teeth: false,
    dressed: false,
    ate_meals: false,
    social_count: 0,
    caffeine: 0,
    alcohol: 0,
    nicotine: 0,
    drugs: 0,
    notes: [],
  }
}

function avg(values: (number | null | undefined)[]): number | null {
  const xs = values.filter((v): v is number => typeof v === 'number')
  if (xs.length === 0) return null
  return Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1))
}

function aggregate(rows: EntryRow[], days: string[]): DaySummary[] {
  const grouped = new Map<string, EntryRow[]>()
  for (const r of rows) {
    const k = r.logged_for
    const list = grouped.get(k) ?? []
    list.push(r)
    grouped.set(k, list)
  }

  return days.map((date) => {
    const rs = grouped.get(date) ?? []
    if (rs.length === 0) return emptyDay(date)
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
      showered: rs.some((r) => r.showered === true),
      brushed_teeth: rs.some((r) => r.brushed_teeth === true),
      dressed: rs.some((r) => r.dressed === true),
      ate_meals: rs.some((r) => r.ate_meals === true),
      social_count: rs.filter((r) => r.social_relation !== null).length,
      caffeine: rs.reduce((a, r) => a + (r.caffeine ?? 0), 0),
      alcohol: rs.reduce((a, r) => a + (r.alcohol ?? 0), 0),
      nicotine: rs.reduce((a, r) => a + (r.nicotine ?? 0), 0),
      drugs: rs.reduce((a, r) => a + (r.drugs ?? 0), 0),
      notes: rs.map((r) => r.note?.trim()).filter((n): n is string => !!n && n.length > 0),
    }
  })
}

function lastSevenDays(today = new Date()): string[] {
  const out: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    out.push(isoDate(d))
  }
  return out
}

function buildUserPrompt(days: DaySummary[]): string {
  return [
    'Här är de senaste 7 dagarna som användaren har loggat. Tomma fält = inget loggat den dagen.',
    '',
    'Skriv en sammanfattning på 2–4 meningar. Lyft fram det mest framträdande (humör, sömn, mönster, eventuella anteckningar). Var konkret men mjuk. Avsluta gärna med en kort observation snarare än ett råd.',
    '',
    'Data (JSON):',
    JSON.stringify(days, null, 2),
  ].join('\n')
}

export type SummaryResult = {
  content: string
  model: string
  generated_at: string
  source: 'cache' | 'fresh' | 'crisis'
}

const inputValidator = z.object({ force: z.boolean().optional() }).optional()

export const getWeeklySummary = createServerFn({ method: 'POST' })
  .inputValidator(inputValidator)
  .handler(async ({ data }) => {
    const force = data?.force === true
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    if (!force) {
      const latest = await readLatest(supabase, user.id, 'summary')
      if (latest && Date.now() - new Date(latest.generated_at).getTime() < FRESHNESS_MS) {
        return {
          content: latest.content,
          model: latest.model,
          generated_at: latest.generated_at,
          source: 'cache',
        } satisfies SummaryResult
      }
    }

    const days = lastSevenDays()
    const rangeStart = days[0]
    const rangeEnd = days[days.length - 1]

    const { data: rows, error } = await supabase
      .from('entries')
      .select(
        'logged_for, mood, energy, anxiety, stress, concentration, sleep_hours, sleep_quality, water_glasses, exercise_min, daylight_min, showered, brushed_teeth, dressed, ate_meals, social_relation, caffeine, alcohol, nicotine, drugs, note',
      )
      .eq('user_id', user.id)
      .gte('logged_for', rangeStart)
      .lte('logged_for', rangeEnd)
      .order('logged_for', { ascending: true })

    if (error) throw new Error(error.message)

    const aggregated = aggregate((rows as EntryRow[]) ?? [], days)
    const inputHash = hashInput({ kind: 'summary', range: [rangeStart, rangeEnd], days: aggregated })

    const daysWithData = aggregated.filter(
      (d) =>
        d.mood !== null ||
        d.energy !== null ||
        d.anxiety !== null ||
        d.stress !== null ||
        d.sleep_hours !== null ||
        d.notes.length > 0,
    ).length

    if (daysWithData < 3) {
      const fallback = 'Vi väntar med sammanfattningen tills det finns lite mer att läsa av.'
      const saved = await writeOutput(supabase, user.id, 'summary', inputHash, fallback, 'static-fallback')
      return {
        content: saved.content,
        model: saved.model,
        generated_at: saved.generated_at,
        source: 'fresh',
      } satisfies SummaryResult
    }

    if (!force) {
      const cached = await readByHash(supabase, user.id, 'summary', inputHash)
      if (cached) {
        return {
          content: cached.content,
          model: cached.model,
          generated_at: cached.generated_at,
          source: 'cache',
        } satisfies SummaryResult
      }
    }

    const allNotes = aggregated.flatMap((d) => d.notes).join('\n')
    if (detectCrisis(allNotes)) {
      const saved = await writeOutput(
        supabase,
        user.id,
        'summary',
        inputHash,
        CRISIS_FALLBACK_SV,
        'crisis-fallback',
      )
      return {
        content: saved.content,
        model: saved.model,
        generated_at: saved.generated_at,
        source: 'crisis',
      } satisfies SummaryResult
    }

    const content = await complete({
      messages: [
        { role: 'system', content: SYSTEM_PREAMBLE },
        { role: 'user', content: buildUserPrompt(aggregated) },
      ],
      maxOutputTokens: SURFACE_LIMITS.summary.maxTokens,
      reasoningEffort: 'minimal',
    })

    if (detectCrisis(content)) {
      const saved = await writeOutput(
        supabase,
        user.id,
        'summary',
        inputHash,
        CRISIS_FALLBACK_SV,
        'crisis-fallback',
      )
      return {
        content: saved.content,
        model: saved.model,
        generated_at: saved.generated_at,
        source: 'crisis',
      } satisfies SummaryResult
    }

    const saved = await writeOutput(supabase, user.id, 'summary', inputHash, content, currentModel())
    return {
      content: saved.content,
      model: saved.model,
      generated_at: saved.generated_at,
      source: 'fresh',
    } satisfies SummaryResult
  })
