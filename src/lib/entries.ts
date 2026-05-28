import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createSupabaseServerClient } from './supabase/server'

const sliderMetric = z.enum(['mood', 'energy', 'concentration', 'anxiety', 'stress'])

const createSliderEntryInput = z.object({
  metric: sliderMetric,
  value: z.number().min(0).max(10),
  note: z.string().trim().max(280).optional(),
})

export const createSliderEntry = createServerFn({ method: 'POST' })
  .inputValidator(createSliderEntryInput)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    const rounded = Number(data.value.toFixed(2))

    const { data: entry, error } = await supabase
      .from('entries')
      .insert({
        user_id: user.id,
        [data.metric]: rounded,
        note: data.note && data.note.length > 0 ? data.note : null,
      })
      .select('id, created_at, logged_for, mood, energy, focus, note')
      .single()

    if (error) throw new Error(error.message)
    return entry
  })

const physicalKind = z.enum(['water', 'exercise', 'daylight'])

const createPhysicalEntryInput = z.object({
  kind: physicalKind,
  amount: z.number().int().positive(),
})

const physicalColumn: Record<z.infer<typeof physicalKind>, string> = {
  water: 'water_glasses',
  exercise: 'exercise_min',
  daylight: 'daylight_min',
}

const physicalMax: Record<z.infer<typeof physicalKind>, number> = {
  water: 50,
  exercise: 1440,
  daylight: 1440,
}

export const createPhysicalEntry = createServerFn({ method: 'POST' })
  .inputValidator(createPhysicalEntryInput)
  .handler(async ({ data }) => {
    if (data.amount > physicalMax[data.kind]) throw new Error('Värdet är för stort')

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    const column = physicalColumn[data.kind]

    const { data: entry, error } = await supabase
      .from('entries')
      .insert({
        user_id: user.id,
        [column]: data.amount,
      })
      .select(`id, created_at, logged_for, ${column}`)
      .single()

    if (error) throw new Error(error.message)
    return entry
  })

const selfCareKind = z.enum(['showered', 'brushed_teeth', 'dressed', 'ate_meals'])

const markSelfCareInput = z.object({
  kind: selfCareKind,
})

export const markSelfCare = createServerFn({ method: 'POST' })
  .inputValidator(markSelfCareInput)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    const { data: entry, error } = await supabase
      .from('entries')
      .insert({
        user_id: user.id,
        [data.kind]: true,
      })
      .select(`id, created_at, logged_for, ${data.kind}`)
      .single()

    if (error) throw new Error(error.message)
    return entry
  })

const socialRelation = z.enum([
  'family',
  'friend',
  'colleague',
  'stranger',
  'partner',
  'neighbor',
  'pet',
  'care',
  'online',
])

const logSocialInteractionInput = z.object({
  relation: socialRelation,
})

export const logSocialInteraction = createServerFn({ method: 'POST' })
  .inputValidator(logSocialInteractionInput)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    const { data: entry, error } = await supabase
      .from('entries')
      .insert({
        user_id: user.id,
        social_relation: data.relation,
      })
      .select('id, created_at, logged_for, social_relation')
      .single()

    if (error) throw new Error(error.message)
    return entry
  })

const substanceKind = z.enum(['caffeine', 'alcohol', 'nicotine', 'drugs'])

const logSubstanceInput = z.object({
  kind: substanceKind,
})

export const logSubstance = createServerFn({ method: 'POST' })
  .inputValidator(logSubstanceInput)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    const { data: entry, error } = await supabase
      .from('entries')
      .insert({
        user_id: user.id,
        [data.kind]: 1,
      })
      .select(`id, created_at, logged_for, ${data.kind}`)
      .single()

    if (error) throw new Error(error.message)
    return entry
  })

export const undoSubstance = createServerFn({ method: 'POST' })
  .inputValidator(logSubstanceInput)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    const today = new Date().toISOString().slice(0, 10)

    const { data: latest, error: selectError } = await supabase
      .from('entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('logged_for', today)
      .not(data.kind, 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (selectError) throw new Error(selectError.message)
    if (!latest) return { undone: false as const }

    const { error: deleteError } = await supabase
      .from('entries')
      .delete()
      .eq('id', latest.id)

    if (deleteError) throw new Error(deleteError.message)
    return { undone: true as const, id: latest.id }
  })

const listEntriesFilter = z.enum([
  'all',
  'note',
  'mood',
  'energy',
  'concentration',
  'anxiety',
  'stress',
  'sleep',
  'substance',
])

export type ListEntriesFilter = z.infer<typeof listEntriesFilter>

const PAGE_SIZE = 25

const listEntriesInput = z.object({
  filter: listEntriesFilter.optional(),
  page: z.number().int().min(0).optional(),
})

export const listEntries = createServerFn({ method: 'POST' })
  .inputValidator(listEntriesInput)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    const filter = data.filter ?? 'all'
    const page = data.page ?? 0
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE

    let query = supabase
      .from('entries')
      .select(
        'id, created_at, logged_for, mood, energy, concentration, anxiety, stress, sleep_hours, sleep_quality, water_glasses, exercise_min, daylight_min, showered, brushed_teeth, dressed, ate_meals, social_relation, caffeine, alcohol, nicotine, drugs, note',
      )
      .eq('user_id', user.id)

    if (filter === 'note') {
      query = query.not('note', 'is', null)
    } else if (filter === 'sleep') {
      query = query.not('sleep_hours', 'is', null)
    } else if (filter === 'substance') {
      query = query.or('caffeine.gt.0,alcohol.gt.0,nicotine.gt.0,drugs.gt.0')
    } else if (filter !== 'all') {
      query = query.not(filter, 'is', null)
    }

    const { data: rows, error } = await query
      .order('logged_for', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw new Error(error.message)
    const all = rows ?? []
    const hasMore = all.length > PAGE_SIZE
    const entries = hasMore ? all.slice(0, PAGE_SIZE) : all
    return { entries, hasMore, page, filter }
  })

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const listEntriesInRangeInput = z.object({
  from: isoDate,
  to: isoDate,
  filter: listEntriesFilter.optional(),
})

export const listEntriesInRange = createServerFn({ method: 'POST' })
  .inputValidator(listEntriesInRangeInput)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    const filter = data.filter ?? 'all'

    let query = supabase
      .from('entries')
      .select(
        'id, created_at, logged_for, mood, energy, concentration, anxiety, stress, sleep_hours, sleep_quality, water_glasses, exercise_min, daylight_min, showered, brushed_teeth, dressed, ate_meals, social_relation, caffeine, alcohol, nicotine, drugs, note',
      )
      .eq('user_id', user.id)
      .gte('logged_for', data.from)
      .lte('logged_for', data.to)

    if (filter === 'note') {
      query = query.not('note', 'is', null)
    } else if (filter === 'sleep') {
      query = query.not('sleep_hours', 'is', null)
    } else if (filter === 'substance') {
      query = query.or('caffeine.gt.0,alcohol.gt.0,nicotine.gt.0,drugs.gt.0')
    } else if (filter !== 'all') {
      query = query.not(filter, 'is', null)
    }

    const { data: rows, error } = await query
      .order('logged_for', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return { entries: rows ?? [] }
  })

const entryIdInput = z.object({ id: z.string().uuid() })

export const getEntry = createServerFn({ method: 'POST' })
  .inputValidator(entryIdInput)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    const { data: entry, error } = await supabase
      .from('entries')
      .select(
        'id, created_at, logged_for, mood, energy, concentration, anxiety, stress, sleep_hours, sleep_quality, water_glasses, exercise_min, daylight_min, showered, brushed_teeth, dressed, ate_meals, social_relation, caffeine, alcohol, nicotine, drugs, note',
      )
      .eq('user_id', user.id)
      .eq('id', data.id)
      .single()

    if (error) throw new Error(error.message)
    return entry
  })

const updateEntryNoteInput = z.object({
  id: z.string().uuid(),
  note: z.string().trim().max(280),
})

export const updateEntryNote = createServerFn({ method: 'POST' })
  .inputValidator(updateEntryNoteInput)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    const { data: entry, error } = await supabase
      .from('entries')
      .update({ note: data.note.length > 0 ? data.note : null })
      .eq('user_id', user.id)
      .eq('id', data.id)
      .select('id, note')
      .single()

    if (error) throw new Error(error.message)
    return entry
  })

export const deleteEntry = createServerFn({ method: 'POST' })
  .inputValidator(entryIdInput)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('user_id', user.id)
      .eq('id', data.id)

    if (error) throw new Error(error.message)
    return { ok: true as const }
  })

const createSleepEntryInput = z.object({
  quality: z.number().min(0).max(10),
  hours: z.number().min(0).max(24),
  note: z.string().trim().max(280).optional(),
})

export const createSleepEntry = createServerFn({ method: 'POST' })
  .inputValidator(createSleepEntryInput)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Inte inloggad')

    const { data: entry, error } = await supabase
      .from('entries')
      .insert({
        user_id: user.id,
        sleep_quality: Number(data.quality.toFixed(2)),
        sleep_hours: Number(data.hours.toFixed(1)),
        note: data.note && data.note.length > 0 ? data.note : null,
      })
      .select('id, created_at, logged_for, sleep_quality, sleep_hours, note')
      .single()

    if (error) throw new Error(error.message)
    return entry
  })
