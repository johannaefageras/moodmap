import { useEffect, useMemo, useState, type ReactNode } from 'react'
import s from './LogSliderModal.module.css'
import { getReframe } from '#/lib/ai/reframe'
import { looksSelfCritical } from '#/lib/ai/safety'

export type SliderMetric = 'mood' | 'energy' | 'sleep' | 'anxiety' | 'stress' | 'concentration'

const emojiModules = import.meta.glob('../assets/emojis/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function emojiSetFor(metric: SliderMetric): string[] {
  return Array.from({ length: 11 }, (_, i) => {
    const suffix = `${metric}-${String(i).padStart(2, '0')}.svg`
    const key = Object.keys(emojiModules).find((k) => k.endsWith(suffix))
    return key ? emojiModules[key] : ''
  })
}

const emojiCache: Partial<Record<SliderMetric, string[]>> = {}

export function emojiFor(metric: SliderMetric, value: number): string {
  const set = (emojiCache[metric] ??= emojiSetFor(metric))
  const idx = Math.min(10, Math.max(0, Math.floor(value)))
  return set[idx]
}

export function LogSliderModal({
  open,
  onClose,
  onSave,
  metric,
  title,
  ariaLabel,
  children,
}: {
  open: boolean
  onClose: () => void
  onSave?: (input: { value: number; note: string }) => Promise<void> | void
  metric: SliderMetric
  title: string
  ariaLabel: string
  children?: ReactNode
}) {
  const [value, setValue] = useState(5)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const [reframe, setReframe] = useState<string | null>(null)
  const [reframeLoading, setReframeLoading] = useState(false)
  const [reframeError, setReframeError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValue(5)
      setNote('')
      setSaving(false)
      setError(null)
      setSavedNote(null)
      setReframe(null)
      setReframeLoading(false)
      setReframeError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const fillPct = useMemo(() => (value / 10) * 100, [value])
  const emojiSrc = emojiFor(metric, value)

  async function handleSave() {
    if (!onSave) {
      onClose()
      return
    }
    setSaving(true)
    setError(null)
    const trimmed = note.trim()
    try {
      await onSave({ value, note: trimmed })
      if (trimmed.length > 0 && looksSelfCritical(trimmed)) {
        setSavedNote(trimmed)
        setSaving(false)
      } else {
        onClose()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel. Försök igen.')
      setSaving(false)
    }
  }

  async function fetchReframe() {
    if (!savedNote || reframeLoading) return
    setReframeLoading(true)
    setReframeError(null)
    try {
      const res = await getReframe({ data: { note: savedNote } })
      setReframe(res.content)
    } catch (e) {
      setReframeError(e instanceof Error ? e.message : 'Det gick inte att hämta nu.')
    } finally {
      setReframeLoading(false)
    }
  }

  if (!open) return null

  if (savedNote) {
    return (
      <div className={s.backdrop} onClick={onClose} role="presentation">
        <div
          className={s.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logslider-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="logslider-title" className={s.title}>Sparat</h2>

          <p className={s.savedNote}>"{savedNote}"</p>

          {reframe ? (
            <p className={s.reframe}>{reframe}</p>
          ) : reframeError ? (
            <p className={s.error}>{reframeError}</p>
          ) : (
            <button
              type="button"
              className={s.reframeLink}
              onClick={fetchReframe}
              disabled={reframeLoading}
            >
              {reframeLoading ? 'Tänker…' : 'Vill du se det från ett annat håll?'}
            </button>
          )}

          <div className={s.actions}>
            <button
              type="button"
              className={`${s.btn} ${s.btnPrimary}`}
              onClick={onClose}
            >
              Stäng
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={s.backdrop} onClick={onClose} role="presentation">
      <div
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logslider-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="logslider-title" className={s.title}>{title}</h2>

        <div className={s.emojiWrap}>
          {emojiSrc ? (
            <img src={emojiSrc} alt="" className={s.emoji} draggable={false} />
          ) : null}
        </div>

        <div className={s.sliderWrap}>
          <div
            className={s.track}
            style={{ ['--fill' as string]: `${fillPct}%` }}
            aria-hidden="true"
          />
          <input
            type="range"
            min={0}
            max={10}
            step={0.01}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className={s.range}
            aria-label={ariaLabel}
          />
        </div>

        <div className={s.scale}>
          <span>0</span>
          <span className={s.scaleValue}>{value.toFixed(2).replace('.', ',')}</span>
          <span>10</span>
        </div>

        {children}

        <label className={s.noteField}>
          <span className={s.noteLabel}>
            Anteckning <span className={s.noteHint}>valfritt</span>
          </span>
          <textarea
            className={s.note}
            placeholder="Något du vill lägga till?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={280}
          />
          <span className={s.noteCount}>{note.length}/280</span>
        </label>

        {error ? <p className={s.error}>{error}</p> : null}

        <div className={s.actions}>
          <button
            type="button"
            className={`${s.btn} ${s.btnGhost}`}
            onClick={onClose}
            disabled={saving}
          >
            Avbryt
          </button>
          <button
            type="button"
            className={`${s.btn} ${s.btnPrimary}`}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Sparar…' : 'Spara'}
          </button>
        </div>
      </div>
    </div>
  )
}
