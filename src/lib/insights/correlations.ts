// Pure correlation scoring + fact rendering. No server imports — unit-testable.
//
// Statistics are computed deterministically here; the warm Swedish phrasing is
// the model's job (see ./server.ts). This module never produces user-facing prose
// and never exposes raw r values to the model.

import type { MetricKey } from '#/lib/colors'

export type MetricField =
  | 'mood'
  | 'energy'
  | 'concentration'
  | 'anxiety'
  | 'stress'
  | 'sleep_hours'
  | 'sleep_quality'
  | 'water'
  | 'exercise'
  | 'daylight'
  | 'social'
  | 'caffeine'
  | 'alcohol'

export type DayInput = {
  date: string
} & Record<MetricField, number | null>

export type Correlation = {
  a: MetricField
  b: MetricField
  lag: 0 | 1
  r: number
  n: number
  direction: 'positive' | 'negative'
}

export const MIN_PAIRS = 10
export const R_THRESHOLD = 0.35
export const TOP_K = 3

type Candidate = { a: MetricField; b: MetricField; lag: 0 | 1 }

// Curated pairs only — never all-vs-all, to avoid spurious findings.
export const CANDIDATE_PAIRS: Candidate[] = [
  // Same-day associations.
  { a: 'daylight', b: 'energy', lag: 0 },
  { a: 'daylight', b: 'mood', lag: 0 },
  { a: 'exercise', b: 'mood', lag: 0 },
  { a: 'exercise', b: 'energy', lag: 0 },
  { a: 'social', b: 'mood', lag: 0 },
  { a: 'stress', b: 'mood', lag: 0 },
  { a: 'anxiety', b: 'mood', lag: 0 },
  { a: 'caffeine', b: 'anxiety', lag: 0 },
  { a: 'alcohol', b: 'mood', lag: 0 },
  { a: 'water', b: 'energy', lag: 0 },
  // Lag-1: yesterday's value (a) vs today's value (b).
  { a: 'sleep_hours', b: 'mood', lag: 1 },
  { a: 'sleep_hours', b: 'energy', lag: 1 },
  { a: 'sleep_hours', b: 'concentration', lag: 1 },
  { a: 'sleep_quality', b: 'mood', lag: 1 },
  { a: 'alcohol', b: 'anxiety', lag: 1 },
  { a: 'alcohol', b: 'mood', lag: 1 },
  { a: 'exercise', b: 'sleep_quality', lag: 1 },
]

export function pearson(pairs: [number, number][]): number | null {
  const n = pairs.length
  if (n < MIN_PAIRS) return null

  let sumX = 0
  let sumY = 0
  for (const [x, y] of pairs) {
    sumX += x
    sumY += y
  }
  const meanX = sumX / n
  const meanY = sumY / n

  let covXY = 0
  let varX = 0
  let varY = 0
  for (const [x, y] of pairs) {
    const dx = x - meanX
    const dy = y - meanY
    covXY += dx * dy
    varX += dx * dx
    varY += dy * dy
  }

  if (varX === 0 || varY === 0) return null
  return covXY / Math.sqrt(varX * varY)
}

// Same-day: pair a[d] with b[d] when both present.
export function sameDayPairs(days: DayInput[], a: MetricField, b: MetricField): [number, number][] {
  const out: [number, number][] = []
  for (const d of days) {
    const x = d[a]
    const y = d[b]
    if (typeof x === 'number' && typeof y === 'number') out.push([x, y])
  }
  return out
}

// Lag-1: pair a on day d (yesterday) with b on day d+1 (today) when both present.
// Assumes `days` is sorted ascending by date and contiguous (one slot per calendar day).
export function laggedPairs(days: DayInput[], a: MetricField, b: MetricField): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < days.length - 1; i++) {
    const x = days[i][a]
    const y = days[i + 1][b]
    if (typeof x === 'number' && typeof y === 'number') out.push([x, y])
  }
  return out
}

export function computeCorrelations(days: DayInput[]): Correlation[] {
  const scored: Correlation[] = []
  for (const c of CANDIDATE_PAIRS) {
    const pairs = c.lag === 0 ? sameDayPairs(days, c.a, c.b) : laggedPairs(days, c.a, c.b)
    const r = pearson(pairs)
    if (r === null || Math.abs(r) < R_THRESHOLD) continue
    scored.push({
      a: c.a,
      b: c.b,
      lag: c.lag,
      r,
      n: pairs.length,
      direction: r >= 0 ? 'positive' : 'negative',
    })
  }
  scored.sort((x, y) => Math.abs(y.r) - Math.abs(x.r))
  return scored.slice(0, TOP_K)
}

export type Strength = 'svagt' | 'måttligt' | 'tydligt'

export const FIELD_LABEL_SV: Record<MetricField, string> = {
  mood: 'humör',
  energy: 'energi',
  concentration: 'koncentration',
  anxiety: 'ångest',
  stress: 'stress',
  sleep_hours: 'sömn',
  sleep_quality: 'sömnkvalitet',
  water: 'vatten',
  exercise: 'träning',
  daylight: 'dagsljus',
  social: 'socialt',
  caffeine: 'koffein',
  alcohol: 'alkohol',
}

// Maps each metric to a color key in METRIC_COLORS for the strength bars.
export const FIELD_COLOR_KEY: Record<MetricField, MetricKey> = {
  mood: 'mood',
  energy: 'energy',
  concentration: 'concentration',
  anxiety: 'anxiety',
  stress: 'stress',
  sleep_hours: 'sleep',
  sleep_quality: 'sleep',
  water: 'water',
  exercise: 'exercise',
  daylight: 'daylight',
  social: 'social',
  caffeine: 'caffeine',
  alcohol: 'alcohol',
}

export function strengthBucket(r: number): Strength {
  const a = Math.abs(r)
  if (a >= 0.6) return 'tydligt'
  if (a >= 0.45) return 'måttligt'
  return 'svagt'
}

// One renderable correlation: deterministic facts + the model's warm one-liner.
export type CorrelationView = {
  a: MetricField
  b: MetricField
  lag: 0 | 1
  direction: 'positive' | 'negative'
  strength: Strength
  rAbs: number // 0..1, for the strength bar width
  text: string // model-generated hedged sentence
}

// The full payload the server fn caches and the route renders. Always JSON, so
// fallbacks (thin data, crisis) are just `{ intro, items: [] }`.
export type CorrelationsPayload = {
  intro: string
  items: CorrelationView[]
}

// Compact, numbered fact list for the model. Deliberately omits raw r values,
// day counts, and any causal framing — the model only receives associations to
// phrase warmly, one sentence per numbered line.
export function correlationFacts(cs: Correlation[]): string {
  return cs
    .map((c, i) => {
      const dir = c.direction === 'positive' ? 'samvarierar uppåt med' : 'samvarierar nedåt med'
      const when = c.lag === 1 ? ' (gårdagens värde mot dagens)' : ''
      return `${i + 1}. ${FIELD_LABEL_SV[c.a]} ${dir} ${FIELD_LABEL_SV[c.b]}${when}; ${strengthBucket(c.r)} samband`
    })
    .join('\n')
}
