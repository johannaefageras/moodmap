import { describe, expect, it } from 'vitest'
import {
  computeCorrelations,
  correlationFacts,
  type DayInput,
  type MetricField,
  laggedPairs,
  pearson,
  sameDayPairs,
} from './correlations'

const FIELDS: MetricField[] = [
  'mood',
  'energy',
  'concentration',
  'anxiety',
  'stress',
  'sleep_hours',
  'sleep_quality',
  'water',
  'exercise',
  'daylight',
  'social',
  'caffeine',
  'alcohol',
]

function emptyDay(i: number): DayInput {
  const day = { date: `2026-01-${String(i + 1).padStart(2, '0')}` } as DayInput
  for (const f of FIELDS) day[f] = null
  return day
}

// Build n contiguous days, then let `fill` set values per index.
function makeDays(n: number, fill: (day: DayInput, i: number) => void): DayInput[] {
  return Array.from({ length: n }, (_, i) => {
    const d = emptyDay(i)
    fill(d, i)
    return d
  })
}

describe('pearson', () => {
  it('returns null below MIN_PAIRS', () => {
    const pairs: [number, number][] = Array.from({ length: 5 }, (_, i) => [i, i])
    expect(pearson(pairs)).toBeNull()
  })

  it('returns null on zero variance', () => {
    const pairs: [number, number][] = Array.from({ length: 12 }, (_, i) => [5, i])
    expect(pearson(pairs)).toBeNull()
  })

  it('is +1 for a perfect positive line', () => {
    const pairs: [number, number][] = Array.from({ length: 12 }, (_, i) => [i, 2 * i + 1])
    expect(pearson(pairs)).toBeCloseTo(1, 5)
  })

  it('is -1 for a perfect negative line', () => {
    const pairs: [number, number][] = Array.from({ length: 12 }, (_, i) => [i, -3 * i])
    expect(pearson(pairs)).toBeCloseTo(-1, 5)
  })
})

describe('pairing helpers', () => {
  it('sameDayPairs skips days where either side is null', () => {
    const days = makeDays(4, (d, i) => {
      d.mood = i === 2 ? null : i
      d.energy = i
    })
    expect(sameDayPairs(days, 'mood', 'energy')).toEqual([
      [0, 0],
      [1, 1],
      [3, 3],
    ])
  })

  it('laggedPairs offsets a by one day before b', () => {
    const days = makeDays(3, (d, i) => {
      d.sleep_hours = i
      d.mood = i * 10
    })
    // a[d] paired with b[d+1]: sleep_hours[0]→mood[1], sleep_hours[1]→mood[2]
    expect(laggedPairs(days, 'sleep_hours', 'mood')).toEqual([
      [0, 10],
      [1, 20],
    ])
  })
})

describe('computeCorrelations', () => {
  it('detects a planted same-day positive relationship with the right sign', () => {
    const days = makeDays(20, (d, i) => {
      d.exercise = i % 7
      d.mood = (i % 7) + 0.1 * Math.sin(i) // strongly tracks exercise
    })
    const out = computeCorrelations(days)
    const ex = out.find((c) => c.a === 'exercise' && c.b === 'mood' && c.lag === 0)
    expect(ex).toBeDefined()
    expect(ex?.direction).toBe('positive')
    expect(ex?.r ?? 0).toBeGreaterThan(0.35)
  })

  it('detects a planted negative relationship', () => {
    const days = makeDays(20, (d, i) => {
      d.stress = i % 10
      d.mood = 10 - (i % 10)
    })
    const out = computeCorrelations(days)
    const st = out.find((c) => c.a === 'stress' && c.b === 'mood')
    expect(st?.direction).toBe('negative')
  })

  it('detects a planted lag-1 relationship (yesterday sleep → today mood)', () => {
    const days = makeDays(20, (d, i) => {
      d.sleep_hours = (i % 6) + 4
    })
    // today's mood follows yesterday's sleep
    for (let i = 1; i < days.length; i++) {
      days[i].mood = (days[i - 1].sleep_hours as number) - 4
    }
    const out = computeCorrelations(days)
    const lag = out.find((c) => c.a === 'sleep_hours' && c.b === 'mood' && c.lag === 1)
    expect(lag).toBeDefined()
    expect(lag?.direction).toBe('positive')
  })

  it('returns nothing when there is too little data', () => {
    const days = makeDays(5, (d, i) => {
      d.exercise = i
      d.mood = i
    })
    expect(computeCorrelations(days)).toEqual([])
  })

  it('caps results at top 3', () => {
    const days = makeDays(30, (d, i) => {
      const v = i % 9
      d.exercise = v
      d.daylight = v
      d.social = v
      d.water = v
      d.mood = v
      d.energy = v
    })
    expect(computeCorrelations(days).length).toBeLessThanOrEqual(3)
  })
})

describe('correlationFacts', () => {
  it('omits raw r values from the model-facing text', () => {
    const facts = correlationFacts([
      { a: 'exercise', b: 'mood', lag: 0, r: 0.732_45, n: 14, direction: 'positive' },
    ])
    expect(facts).not.toContain('0.73')
    expect(facts).not.toContain('0,73')
    expect(facts).toContain('träning')
    expect(facts).toContain('humör')
  })
})
