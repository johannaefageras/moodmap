import { useState } from 'react'
import d from './DayDetailsModal.module.css'
import type { listEntriesInRange } from '#/lib/entries'

type EntryRow = Awaited<ReturnType<typeof listEntriesInRange>>['entries'][number]

const SLIDER_METRICS = [
  { key: 'mood', label: 'Humör', unit: '/10' },
  { key: 'energy', label: 'Energi', unit: '/10' },
  { key: 'concentration', label: 'Koncentration', unit: '/10' },
  { key: 'anxiety', label: 'Ångest', unit: '/10' },
  { key: 'stress', label: 'Stress', unit: '/10' },
] as const

const SELF_CARE = [
  { key: 'showered', label: 'Duschat' },
  { key: 'brushed_teeth', label: 'Tandborstat' },
  { key: 'dressed', label: 'Klätt på' },
  { key: 'medication', label: 'Tagit medicin' },
  { key: 'screen_free', label: 'Skärmfri stund' },
  { key: 'recovery', label: 'Återhämtning' },
  { key: 'ate_breakfast', label: 'Frukost' },
  { key: 'ate_lunch', label: 'Lunch' },
  { key: 'ate_dinner', label: 'Middag' },
  { key: 'ate_meals', label: 'Ätit' },
] as const

const SUBSTANCES = [
  { key: 'caffeine', label: 'Koffein' },
  { key: 'alcohol', label: 'Alkohol' },
  { key: 'nicotine', label: 'Nikotin' },
  { key: 'drugs', label: 'Droger' },
] as const

const SOCIAL_LABEL: Record<string, string> = {
  family: 'familj',
  friend: 'vän',
  partner: 'partner',
  colleague: 'kollega',
  neighbor: 'granne',
  pet: 'husdjur',
  care: 'vårdkontakt',
  online: 'online',
  stranger: 'annan',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

function formatNum(n: number, digits = 1): string {
  return n.toFixed(digits).replace('.', ',')
}

type SliderSummary = {
  key: (typeof SLIDER_METRICS)[number]['key']
  label: string
  unit: string
  entries: EntryRow[]
  values: number[]
}

function buildSliderSummaries(entries: EntryRow[]): SliderSummary[] {
  return SLIDER_METRICS.map((m) => {
    const matched = entries.filter((e) => e[m.key] !== null)
    return {
      key: m.key,
      label: m.label,
      unit: m.unit,
      entries: matched,
      values: matched.map((e) => e[m.key] as number),
    }
  }).filter((s) => s.entries.length > 0)
}

function sliderSummaryText(s: SliderSummary): string {
  if (s.values.length === 1) return `${formatNum(s.values[0])}${s.unit}`
  const min = Math.min(...s.values)
  const max = Math.max(...s.values)
  if (min === max) return `${formatNum(min)}${s.unit} · ${s.values.length} ggr`
  return `${formatNum(min)} → ${formatNum(max)}${s.unit} · ${s.values.length} ggr`
}

type HealthSummary = {
  label: string
  total: number
  unit: string
  entries: EntryRow[]
}

function buildHealthSummaries(entries: EntryRow[]): HealthSummary[] {
  const defs = [
    { key: 'water_glasses' as const, label: 'Vatten', unit: 'glas' },
    { key: 'exercise_min' as const, label: 'Träning', unit: 'min' },
    { key: 'daylight_min' as const, label: 'Dagsljus', unit: 'min' },
  ]
  const out: HealthSummary[] = []
  for (const def of defs) {
    const matched = entries.filter((e) => e[def.key])
    if (matched.length === 0) continue
    const total = matched.reduce((sum, e) => sum + ((e[def.key] as number) ?? 0), 0)
    out.push({ label: def.label, total, unit: def.unit, entries: matched })
  }
  return out
}

function buildSleepRows(entries: EntryRow[]): EntryRow[] {
  return entries.filter((e) => e.sleep_hours !== null || e.sleep_quality !== null)
}

function buildSelfCareRows(entries: EntryRow[]): { label: string; entry: EntryRow }[] {
  const out: { label: string; entry: EntryRow }[] = []
  for (const e of entries) {
    for (const sc of SELF_CARE) {
      if (e[sc.key]) out.push({ label: sc.label, entry: e })
    }
    if (e.social_relation) {
      out.push({ label: `Socialt · ${SOCIAL_LABEL[e.social_relation] ?? e.social_relation}`, entry: e })
    }
  }
  return out
}

type SubstanceSummary = {
  key: (typeof SUBSTANCES)[number]['key']
  label: string
  count: number
  entries: EntryRow[]
}

function buildSubstanceSummaries(entries: EntryRow[]): SubstanceSummary[] {
  return SUBSTANCES.map((sub) => {
    const matched = entries.filter((e) => e[sub.key])
    const count = matched.reduce((sum, e) => sum + ((e[sub.key] as number) ?? 0), 0)
    return { key: sub.key, label: sub.label, count, entries: matched }
  }).filter((s) => s.entries.length > 0)
}

function notesWithText(entries: EntryRow[]): EntryRow[] {
  return entries.filter((e) => e.note && e.note.trim().length > 0)
}

function entryDescriptor(e: EntryRow): string {
  for (const m of SLIDER_METRICS) {
    if (e[m.key] !== null) return `${m.label} ${formatNum(e[m.key] as number)}${m.unit}`
  }
  if (e.sleep_hours !== null || e.sleep_quality !== null) {
    const parts: string[] = []
    if (e.sleep_hours !== null) parts.push(`${formatNum(e.sleep_hours)} h`)
    if (e.sleep_quality !== null) parts.push(`${formatNum(e.sleep_quality)}/10`)
    return `Sömn ${parts.join(' · ')}`
  }
  if (e.water_glasses) return `+${e.water_glasses} glas`
  if (e.exercise_min) return `+${e.exercise_min} min träning`
  if (e.daylight_min) return `+${e.daylight_min} min dagsljus`
  for (const sc of SELF_CARE) if (e[sc.key]) return sc.label
  if (e.social_relation) return `Socialt · ${SOCIAL_LABEL[e.social_relation] ?? e.social_relation}`
  for (const sub of SUBSTANCES) if (e[sub.key]) return `${sub.label} ×${e[sub.key]}`
  if (e.note) return 'Anteckning'
  return 'Inlägg'
}

export function hasAnyContent(entries: EntryRow[]): boolean {
  return entries.length > 0
}

export function DaySummary({
  entries,
  onPickEntry,
}: {
  entries: EntryRow[]
  onPickEntry: (id: string) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const sliders = buildSliderSummaries(entries)
  const sleep = buildSleepRows(entries)
  const health = buildHealthSummaries(entries)
  const selfCare = buildSelfCareRows(entries)
  const substances = buildSubstanceSummaries(entries)
  const notes = notesWithText(entries)

  return (
    <div className={d.sections}>
      {sliders.length > 0 ? (
        <section className={d.section}>
          <h3 className={d.sectionHead}>Värden</h3>
          <ul className={d.rowList}>
            {sliders.map((sl) => {
              const isOpen = expanded.has(`slider:${sl.key}`)
              return (
                <li key={sl.key}>
                  <button
                    type="button"
                    className={d.summaryRow}
                    onClick={() => toggle(`slider:${sl.key}`)}
                    aria-expanded={isOpen}
                  >
                    <span className={d.rowLabel}>{sl.label}</span>
                    <span className={d.rowValue}>{sliderSummaryText(sl)}</span>
                    <span className={`${d.chev} ${isOpen ? d.chevOpen : ''}`} aria-hidden>›</span>
                  </button>
                  {isOpen ? (
                    <ul className={d.detailList}>
                      {sl.entries.map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            className={d.detailRow}
                            onClick={() => onPickEntry(e.id)}
                          >
                            <span className={d.detailTime}>{formatTime(e.created_at)}</span>
                            <span className={d.detailValue}>
                              {formatNum(e[sl.key] as number)}{sl.unit}
                            </span>
                            {e.note ? <span className={d.detailNote}>{e.note}</span> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {sleep.length > 0 ? (
        <section className={d.section}>
          <h3 className={d.sectionHead}>Sömn</h3>
          <ul className={d.rowList}>
            {sleep.map((e) => {
              const parts: string[] = []
              if (e.sleep_hours !== null) parts.push(`${formatNum(e.sleep_hours)} h`)
              if (e.sleep_quality !== null) parts.push(`${formatNum(e.sleep_quality)}/10`)
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className={d.summaryRow}
                    onClick={() => onPickEntry(e.id)}
                  >
                    <span className={d.rowLabel}>{formatTime(e.created_at)}</span>
                    <span className={d.rowValue}>{parts.join(' · ')}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {health.length > 0 ? (
        <section className={d.section}>
          <h3 className={d.sectionHead}>Hälsa</h3>
          <ul className={d.rowList}>
            {health.map((hs) => {
              const key = `health:${hs.label}`
              const isOpen = expanded.has(key)
              return (
                <li key={hs.label}>
                  <button
                    type="button"
                    className={d.summaryRow}
                    onClick={() => toggle(key)}
                    aria-expanded={isOpen}
                  >
                    <span className={d.rowLabel}>{hs.label}</span>
                    <span className={d.rowValue}>
                      {hs.total} {hs.unit}
                      {hs.entries.length > 1 ? ` · ${hs.entries.length} ggr` : ''}
                    </span>
                    <span className={`${d.chev} ${isOpen ? d.chevOpen : ''}`} aria-hidden>›</span>
                  </button>
                  {isOpen ? (
                    <ul className={d.detailList}>
                      {hs.entries.map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            className={d.detailRow}
                            onClick={() => onPickEntry(e.id)}
                          >
                            <span className={d.detailTime}>{formatTime(e.created_at)}</span>
                            <span className={d.detailValue}>{entryDescriptor(e)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {selfCare.length > 0 ? (
        <section className={d.section}>
          <h3 className={d.sectionHead}>Rutiner</h3>
          <div className={d.chips}>
            {selfCare.map((sc, i) => (
              <button
                key={`${sc.entry.id}-${i}`}
                type="button"
                className={d.chip}
                onClick={() => onPickEntry(sc.entry.id)}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {substances.length > 0 ? (
        <section className={d.section}>
          <h3 className={d.sectionHead}>Substanser</h3>
          <ul className={d.rowList}>
            {substances.map((sub) => {
              const key = `sub:${sub.key}`
              const isOpen = expanded.has(key)
              return (
                <li key={sub.key}>
                  <button
                    type="button"
                    className={d.summaryRow}
                    onClick={() => toggle(key)}
                    aria-expanded={isOpen}
                  >
                    <span className={d.rowLabel}>{sub.label}</span>
                    <span className={d.rowValue}>×{sub.count}</span>
                    <span className={`${d.chev} ${isOpen ? d.chevOpen : ''}`} aria-hidden>›</span>
                  </button>
                  {isOpen ? (
                    <ul className={d.detailList}>
                      {sub.entries.map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            className={d.detailRow}
                            onClick={() => onPickEntry(e.id)}
                          >
                            <span className={d.detailTime}>{formatTime(e.created_at)}</span>
                            <span className={d.detailValue}>×{e[sub.key]}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {notes.length > 0 ? (
        <section className={d.section}>
          <h3 className={d.sectionHead}>Anteckningar</h3>
          <ul className={d.noteList}>
            {notes.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={d.noteCard}
                  onClick={() => onPickEntry(e.id)}
                >
                  <span className={d.noteMeta}>
                    {formatTime(e.created_at)} · {entryDescriptor(e)}
                  </span>
                  <span className={d.noteBody}>{e.note}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
