import { useEffect, useState } from 'react'
import s from './LogSliderModal.module.css'
import { deleteEntry, getEntry, updateEntryNote } from '#/lib/entries'

type Entry = Awaited<ReturnType<typeof getEntry>>

const WEEKDAY_SV = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
const MONTH_SV = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
]

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${WEEKDAY_SV[d.getDay()]} ${d.getDate()} ${MONTH_SV[d.getMonth()]}`
}

function formatNum(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return '—'
  return n.toFixed(digits).replace('.', ',')
}

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

type SummaryLine = { label: string; value: string }

function summarize(entry: Entry): SummaryLine[] {
  const out: SummaryLine[] = []
  if (entry.mood !== null) out.push({ label: 'Humör', value: `${formatNum(entry.mood)}/10` })
  if (entry.energy !== null) out.push({ label: 'Energi', value: `${formatNum(entry.energy)}/10` })
  if (entry.concentration !== null) out.push({ label: 'Koncentration', value: `${formatNum(entry.concentration)}/10` })
  if (entry.anxiety !== null) out.push({ label: 'Ångest', value: `${formatNum(entry.anxiety)}/10` })
  if (entry.stress !== null) out.push({ label: 'Stress', value: `${formatNum(entry.stress)}/10` })
  if (entry.sleep_hours !== null) out.push({ label: 'Sömn', value: `${formatNum(entry.sleep_hours)} h` })
  if (entry.sleep_quality !== null) out.push({ label: 'Sömnkvalitet', value: `${formatNum(entry.sleep_quality)}/10` })
  if (entry.water_glasses) out.push({ label: 'Vatten', value: `${entry.water_glasses} glas` })
  if (entry.exercise_min) out.push({ label: 'Träning', value: `${entry.exercise_min} min` })
  if (entry.daylight_min) out.push({ label: 'Dagsljus', value: `${entry.daylight_min} min` })
  if (entry.showered) out.push({ label: 'Duschat', value: 'ja' })
  if (entry.brushed_teeth) out.push({ label: 'Borstat tänderna', value: 'ja' })
  if (entry.dressed) out.push({ label: 'Klätt på', value: 'ja' })
  if (entry.medication) out.push({ label: 'Tagit medicin', value: 'ja' })
  if (entry.screen_free) out.push({ label: 'Skärmfri stund', value: 'ja' })
  if (entry.recovery) out.push({ label: 'Återhämtning', value: 'ja' })
  if (entry.ate_breakfast) out.push({ label: 'Frukost', value: 'ja' })
  if (entry.ate_lunch) out.push({ label: 'Lunch', value: 'ja' })
  if (entry.ate_dinner) out.push({ label: 'Middag', value: 'ja' })
  if (entry.ate_meals) out.push({ label: 'Ätit', value: 'ja' })
  if (entry.social_relation) out.push({ label: 'Socialt', value: SOCIAL_LABEL[entry.social_relation] ?? entry.social_relation })
  if (entry.caffeine) out.push({ label: 'Koffein', value: `${entry.caffeine} st` })
  if (entry.alcohol) out.push({ label: 'Alkohol', value: `${entry.alcohol} st` })
  if (entry.nicotine) out.push({ label: 'Nikotin', value: `${entry.nicotine} st` })
  if (entry.drugs) out.push({ label: 'Droger', value: `${entry.drugs} st` })
  return out
}

export function EntryEditModal({
  open,
  entryId,
  onClose,
  onChanged,
}: {
  open: boolean
  entryId: string | null
  onClose: () => void
  onChanged: () => void | Promise<void>
}) {
  const [entry, setEntry] = useState<Entry | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !entryId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setEntry(null)
    setNote('')
    setConfirmingDelete(false)
    getEntry({ data: { id: entryId } })
      .then((res) => {
        if (cancelled) return
        setEntry(res)
        setNote(res.note ?? '')
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Det gick inte att läsa in.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, entryId])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const summary = entry ? summarize(entry) : []
  const noteChanged = entry ? (note.trim() !== (entry.note ?? '')) : false

  async function save() {
    if (!entry || saving) return
    setSaving(true)
    setError(null)
    try {
      await updateEntryNote({ data: { id: entry.id, note: note.trim() } })
      await onChanged()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel. Försök igen.')
      setSaving(false)
    }
  }

  async function remove() {
    if (!entry || saving) return
    setSaving(true)
    setError(null)
    try {
      await deleteEntry({ data: { id: entry.id } })
      await onChanged()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att ta bort.')
      setSaving(false)
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose} role="presentation">
      <div
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entryedit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="entryedit-title" className={s.title}>
          {entry ? formatDate(entry.logged_for) : 'Inlägg'}
        </h2>

        {loading ? (
          <p className={s.summaryEmpty}>Läser in…</p>
        ) : entry ? (
          <>
            <div className={s.summary}>
              {summary.length === 0 ? (
                <span className={s.summaryEmpty}>Bara en anteckning.</span>
              ) : (
                summary.map((row) => (
                  <span key={row.label}>
                    {row.label}: <b>{row.value}</b>
                  </span>
                ))
              )}
            </div>

            <label className={s.noteField}>
              <span className={s.noteLabel}>
                Anteckning <span className={s.noteHint}>valfritt</span>
              </span>
              <textarea
                className={s.note}
                placeholder="Något du vill lägga till?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={280}
              />
              <span className={s.noteCount}>{note.length}/280</span>
            </label>

            {confirmingDelete ? (
              <p className={s.deletePrompt}>Är du säker? Det går inte att ångra.</p>
            ) : null}
          </>
        ) : null}

        {error ? <p className={s.error}>{error}</p> : null}

        <div className={s.actions}>
          {entry ? (
            confirmingDelete ? (
              <button
                type="button"
                className={`${s.btn} ${s.btnDanger}`}
                disabled={saving}
                onClick={remove}
              >
                {saving ? 'Tar bort…' : 'Ja, ta bort'}
              </button>
            ) : (
              <button
                type="button"
                className={`${s.btn} ${s.btnDanger}`}
                disabled={saving}
                onClick={() => setConfirmingDelete(true)}
              >
                Ta bort
              </button>
            )
          ) : null}
          <button
            type="button"
            className={`${s.btn} ${s.btnGhost}`}
            onClick={onClose}
            disabled={saving}
          >
            {confirmingDelete ? 'Nej, behåll' : 'Avbryt'}
          </button>
          {!confirmingDelete && entry ? (
            <button
              type="button"
              className={`${s.btn} ${s.btnPrimary}`}
              disabled={saving || !noteChanged}
              onClick={save}
            >
              {saving ? 'Sparar…' : 'Spara'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
