import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { fetchCurrentUser } from '#/lib/auth'
import { Sidebar } from '#/components/Sidebar'
import { EntryEditModal } from '#/components/EntryEditModal'
import { DayDetailsModal } from '#/components/DayDetailsModal'
import { listEntriesInRange } from '#/lib/entries'
import s from './index.module.css'
import h from './historik.module.css'

export const Route = createFileRoute('/historik')({
  beforeLoad: async () => {
    const user = await fetchCurrentUser()
    if (!user) throw redirect({ to: '/logga-in' })
    return { user }
  },
  component: HistorikPage,
})

type EntryRow = Awaited<ReturnType<typeof listEntriesInRange>>['entries'][number]

const WEEKDAYS_SHORT_SV = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const MONTH_SV = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
]

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function weekdayMon(d: Date): number {
  return (d.getDay() + 6) % 7
}

function startOfWeek(d: Date): Date {
  return addDays(d, -weekdayMon(d))
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function monthLabel(cursor: Date): string {
  const name = MONTH_SV[cursor.getMonth()]
  return `${name[0].toUpperCase()}${name.slice(1)} ${cursor.getFullYear()}`
}

function monthRange(cursor: Date): { from: Date; to: Date } {
  const first = startOfMonth(cursor)
  const last = endOfMonth(cursor)
  return { from: startOfWeek(first), to: addDays(startOfWeek(last), 6) }
}

function groupByDate(entries: EntryRow[]): Map<string, EntryRow[]> {
  const map = new Map<string, EntryRow[]>()
  for (const e of entries) {
    const arr = map.get(e.logged_for)
    if (arr) arr.push(e)
    else map.set(e.logged_for, [e])
  }
  return map
}

function HistorikPage() {
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const today = useMemo(() => new Date(), [])
  const { from, to } = useMemo(() => monthRange(cursor), [cursor])
  const fromIsoStr = toIso(from)
  const toIsoStr = toIso(to)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listEntriesInRange({ data: { from: fromIsoStr, to: toIsoStr } })
      .then((res) => {
        if (cancelled) return
        setEntries(res.entries)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Något gick fel.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fromIsoStr, toIsoStr])

  async function refresh() {
    const res = await listEntriesInRange({
      data: { from: fromIsoStr, to: toIsoStr },
    })
    setEntries(res.entries)
    await router.invalidate()
  }

  const byDate = useMemo(() => groupByDate(entries), [entries])
  const openDayEntries = openDay ? byDate.get(openDay) ?? [] : []

  const nextDisabled =
    cursor.getFullYear() > today.getFullYear() ||
    (cursor.getFullYear() === today.getFullYear() && cursor.getMonth() >= today.getMonth())

  return (
    <div className={`${s.app} ${s.appTwoCol}`}>
      <Sidebar user={user} active="historik" />
      <main className={s.main}>
        <header className={h.head}>
          <div>
            <h1 className={h.title}>Historik</h1>
            <p className={h.sub}>Bläddra bakåt i tiden och klicka på en dag.</p>
          </div>
        </header>

        <div className={h.toolbar}>
          <div className={h.nav}>
            <button
              type="button"
              className={h.navBtn}
              onClick={() => setCursor((c) => addMonths(c, -1))}
              aria-label="Föregående månad"
            >
              ‹
            </button>
            <button
              type="button"
              className={h.todayBtn}
              onClick={() => setCursor(new Date())}
            >
              Idag
            </button>
            <button
              type="button"
              className={h.navBtn}
              disabled={nextDisabled}
              onClick={() => setCursor((c) => addMonths(c, 1))}
              aria-label="Nästa månad"
            >
              ›
            </button>
            <span className={h.rangeLabel}>{monthLabel(cursor)}</span>
          </div>
        </div>

        {error ? (
          <p className={h.empty}>{error}</p>
        ) : (
          <MonthGrid
            cursor={cursor}
            today={today}
            byDate={byDate}
            loading={loading}
            onPickDay={(iso) => setOpenDay(iso)}
          />
        )}

        <DayDetailsModal
          open={openDay !== null}
          date={openDay}
          entries={openDayEntries}
          onClose={() => setOpenDay(null)}
          onPickEntry={(id) => setEditingId(id)}
        />

        <EntryEditModal
          open={editingId !== null}
          entryId={editingId}
          onClose={() => setEditingId(null)}
          onChanged={async () => {
            await refresh()
          }}
        />
      </main>
    </div>
  )
}

function MonthGrid({
  cursor,
  today,
  byDate,
  loading,
  onPickDay,
}: {
  cursor: Date
  today: Date
  byDate: Map<string, EntryRow[]>
  loading: boolean
  onPickDay: (iso: string) => void
}) {
  const first = startOfMonth(cursor)
  const last = endOfMonth(cursor)
  const gridStart = startOfWeek(first)
  const gridEnd = addDays(startOfWeek(last), 6)
  const days: Date[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d)

  return (
    <div className={`${h.month} ${loading ? h.dim : ''}`}>
      <div className={h.weekHeader}>
        {WEEKDAYS_SHORT_SV.map((w) => (
          <span key={w} className={h.weekHeaderCell}>{w}</span>
        ))}
      </div>
      <div className={h.monthGrid}>
        {days.map((d) => {
          const iso = toIso(d)
          const dayEntries = byDate.get(iso) ?? []
          const hasNote = dayEntries.some((e) => e.note)
          const outOfMonth = d.getMonth() !== cursor.getMonth()
          const isToday = sameDay(d, today)
          const isFuture = d > today
          return (
            <button
              type="button"
              key={iso}
              className={`${h.monthCell} ${outOfMonth ? h.outOfMonth : ''} ${isToday ? h.todayCell : ''}`}
              onClick={() => !isFuture && onPickDay(iso)}
              disabled={isFuture}
              aria-label={`${d.getDate()} ${MONTH_SV[d.getMonth()]}, ${dayEntries.length} inlägg`}
            >
              <span className={h.monthDayNum}>{d.getDate()}</span>
              {dayEntries.length > 0 ? (
                <span className={`${h.dot} ${hasNote ? h.dotRing : ''}`} aria-hidden />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
