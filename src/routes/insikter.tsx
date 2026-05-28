import { useEffect, useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { fetchCurrentUser } from '#/lib/auth'
import { Sidebar } from '#/components/Sidebar'
import { METRIC_COLORS } from '#/lib/colors'
import {
  FIELD_COLOR_KEY,
  FIELD_LABEL_SV,
  type CorrelationsPayload,
  type CorrelationView,
} from '#/lib/insights/correlations'
import { getCorrelations } from '#/lib/insights/server'
import s from './index.module.css'
import c from './insikter.module.css'

export const Route = createFileRoute('/insikter')({
  beforeLoad: async () => {
    const user = await fetchCurrentUser()
    if (!user) throw redirect({ to: '/logga-in' })
    return { user }
  },
  component: InsikterPage,
})

function InsikterPage() {
  const { user } = Route.useRouteContext()
  return (
    <div className={`${s.app} ${s.appTwoCol}`}>
      <Sidebar user={user} active="insikter" />
      <main className={s.main}>
        <CorrelationView_ />
      </main>
    </div>
  )
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  return `Uppdaterad ${date} · ${time}`
}

function parsePayload(content: string): CorrelationsPayload | null {
  try {
    const p = JSON.parse(content) as CorrelationsPayload
    if (typeof p.intro !== 'string' || !Array.isArray(p.items)) return null
    return p
  } catch {
    return null
  }
}

function CorrelationView_() {
  const [payload, setPayload] = useState<CorrelationsPayload | null>(null)
  const [stamp, setStamp] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function apply(res: { content: string; generated_at: string }) {
    setPayload(parsePayload(res.content))
    setStamp(formatTimestamp(res.generated_at))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCorrelations({ data: {} })
      .then((res) => {
        if (!cancelled) apply(res)
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
  }, [])

  async function refresh() {
    if (refreshing) return
    setRefreshing(true)
    setError(null)
    try {
      apply(await getCorrelations({ data: { force: true } }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className={c.wrap}>
      <div className={c.head}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: '-0.02em', fontWeight: 700 }}>
          Vad rör ditt mående?
        </h1>
        <span className={c.aiPill}>AI</span>
      </div>

      {loading ? (
        <p className={c.state}>Letar efter samband i din data…</p>
      ) : error ? (
        <p className={c.state}>Det gick inte att hämta insikterna just nu. {error}</p>
      ) : payload ? (
        <>
          <p className={c.intro}>{payload.intro}</p>
          {payload.items.length > 0 ? (
            <div className={c.list}>
              {payload.items.map((item, i) => (
                <CorrelationRow key={`${item.a}-${item.b}-${item.lag}-${i}`} item={item} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <div className={c.foot}>
        <span className={c.stamp}>{stamp}</span>
        <button
          type="button"
          className={`${s.btn} ${s.btnSmall} ${s.btnAccentOutline}`}
          onClick={refresh}
          disabled={refreshing || loading}
        >
          {refreshing ? 'Uppdaterar…' : 'Uppdatera'}
        </button>
      </div>
    </div>
  )
}

function CorrelationRow({ item }: { item: CorrelationView }) {
  const colorA = METRIC_COLORS[FIELD_COLOR_KEY[item.a]]
  const colorB = METRIC_COLORS[FIELD_COLOR_KEY[item.b]]
  return (
    <div className={c.row}>
      <div className={c.pair}>
        <span className={c.dot} style={{ background: colorA }} />
        {FIELD_LABEL_SV[item.a]}
        <span className={c.arrow}>{item.lag === 1 ? '↦' : '↔'}</span>
        <span className={c.dot} style={{ background: colorB }} />
        {FIELD_LABEL_SV[item.b]}
        <span className={c.when}>{item.lag === 1 ? 'igår → idag' : 'samma dag'}</span>
      </div>
      <div className={c.barRow}>
        <div className={c.barTrack}>
          <div
            className={c.barFill}
            style={{ width: `${Math.round(item.rAbs * 100)}%`, background: colorB }}
          />
        </div>
        <span className={c.strength}>{item.strength}</span>
      </div>
      <p className={c.text}>{item.text}</p>
    </div>
  )
}
