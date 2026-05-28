import { useEffect } from 'react'
import s from './LogSliderModal.module.css'
import d from './DayDetailsModal.module.css'
import { DaySummary } from './DaySummary'
import type { listEntriesInRange } from '#/lib/entries'

type EntryRow = Awaited<ReturnType<typeof listEntriesInRange>>['entries'][number]

const WEEKDAY_SV = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
const MONTH_SV = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
]

function formatDayHeader(iso: string): string {
  const date = new Date(iso + 'T00:00:00')
  return `${WEEKDAY_SV[date.getDay()]} ${date.getDate()} ${MONTH_SV[date.getMonth()]}`
}

export function DayDetailsModal({
  open,
  date,
  entries,
  onClose,
  onPickEntry,
}: {
  open: boolean
  date: string | null
  entries: EntryRow[]
  onClose: () => void
  onPickEntry: (id: string) => void
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !date) return null

  return (
    <div className={s.backdrop} onClick={onClose} role="presentation">
      <div
        className={`${s.modal} ${d.modal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="daydetails-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="daydetails-title" className={s.title}>
          {formatDayHeader(date)}
        </h2>

        {entries.length === 0 ? (
          <p className={s.summaryEmpty}>Inga inlägg den här dagen.</p>
        ) : (
          <DaySummary entries={entries} onPickEntry={onPickEntry} />
        )}

        <div className={s.actions}>
          <button
            type="button"
            className={`${s.btn} ${s.btnGhost}`}
            onClick={onClose}
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  )
}
