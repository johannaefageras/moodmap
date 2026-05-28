import { useEffect, useState } from 'react'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { fetchCurrentUser } from '#/lib/auth'
import { EntryEditModal } from '#/components/EntryEditModal'
import { LogSliderModal } from '#/components/LogSliderModal'
import { LogAnythingModal } from '#/components/LogAnythingModal'
import { Sidebar } from '#/components/Sidebar'
import modalS from '#/components/LogSliderModal.module.css'
import {
  createPhysicalEntry,
  createSleepEntry,
  createSliderEntry,
  logSocialInteraction,
  logSubstance,
  markSelfCare,
  undoSubstance,
} from '#/lib/entries'
import { getWeeklySummary, type SummaryResult } from '#/lib/ai/summary'
import { getPatternObservation, type PatternResult } from '#/lib/ai/pattern'
import { getChartSeries, getDashboardSummary, type ChartSeries, type DashboardSummary } from '#/lib/dashboard'
import { METRIC_COLORS } from '#/lib/colors'

type PhysicalKind = 'water' | 'exercise' | 'daylight'
type SelfCareKind =
  | 'showered'
  | 'brushed_teeth'
  | 'dressed'
  | 'medication'
  | 'screen_free'
  | 'recovery'
type MealKind = 'ate_breakfast' | 'ate_lunch' | 'ate_dinner'
type SocialRelation =
  | 'family'
  | 'friend'
  | 'colleague'
  | 'stranger'
  | 'partner'
  | 'neighbor'
  | 'pet'
  | 'care'
  | 'online'
type SubstanceKind = 'caffeine' | 'alcohol' | 'nicotine' | 'drugs'
import s from './index.module.css'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const user = await fetchCurrentUser()
    if (!user) throw redirect({ to: '/logga-in' })
    return { user }
  },
  loader: async () => {
    return { dashboard: await getDashboardSummary() }
  },
  component: Dashboard,
})

function Dashboard() {
  const { user } = Route.useRouteContext()
  const { dashboard } = Route.useLoaderData()
  if (dashboard.loggedDaysLast30 === 0) {
    return (
      <div className={s.app}>
        <Sidebar user={user} active="oversikt" />
        <main className={s.main}>
          <EmptyState dashboard={dashboard} />
        </main>
      </div>
    )
  }
  return (
    <div className={s.app}>
      <Sidebar user={user} active="oversikt" />
      <main className={s.main}>
        <Topbar dashboard={dashboard} />
        <StatsRow dashboard={dashboard} />
        <CombinedChartCard dashboard={dashboard} />

        <SectionHeader title="Mående" sub="Hur du känner dig inombords." />
        <div className={s.metricGrid}>
          <MoodCard today={dashboard.today.mood} avg7d={dashboard.avg7d.mood} data={dashboard.series30d.mood} />
          <EnergyCard today={dashboard.today.energy} avg7d={dashboard.avg7d.energy} data={dashboard.series30d.energy} />
          <SleepCard
            hoursToday={dashboard.today.sleepHours}
            avg7dHours={dashboard.avg7d.sleepHours}
            data={dashboard.series30d.sleepHours}
          />
          <AnxietyCard today={dashboard.today.anxiety} avg7d={dashboard.avg7d.anxiety} data={dashboard.series30d.anxiety} />
          <StressCard today={dashboard.today.stress} avg7d={dashboard.avg7d.stress} data={dashboard.series30d.stress} />
          <ConcentrationCard
            today={dashboard.today.concentration}
            avg7d={dashboard.avg7d.concentration}
            data={dashboard.series30d.concentration}
          />
        </div>

        <Divider />

        <SectionHeader title="Fysiskt" sub="Kroppen, rörelse och dagsljus." />
        <div className={s.metricGrid}>
          <WaterCard today={dashboard.today.water} avg7d={dashboard.avg7d.waterPerDay} data={dashboard.series30d.water} />
          <ExerciseCard today={dashboard.today.exercise} avg7d={dashboard.avg7d.exercisePerDay} data={dashboard.series30d.exercise} />
          <SunlightCard today={dashboard.today.daylight} avg7d={dashboard.avg7d.daylightPerDay} data={dashboard.series30d.daylight} />
          <MealsCard
            today={{
              ate_breakfast: dashboard.today.ate_breakfast,
              ate_lunch: dashboard.today.ate_lunch,
              ate_dinner: dashboard.today.ate_dinner,
            }}
            data={{
              ate_breakfast: dashboard.series30d.ate_breakfast,
              ate_lunch: dashboard.series30d.ate_lunch,
              ate_dinner: dashboard.series30d.ate_dinner,
            }}
          />
        </div>

        <Divider />

        <SectionHeader title="Egenvård" sub="De små sakerna som ändå räknas." />
        <div className={s.metricGrid}>
          <ToggleCard kind="showered" label="Duschat" doneTodayInitial={dashboard.today.showered} data={dashboard.series30d.showered} />
          <ToggleCard kind="brushed_teeth" label="Borstat tänderna" doneTodayInitial={dashboard.today.brushed_teeth} data={dashboard.series30d.brushed_teeth} />
          <ToggleCard kind="dressed" label="Klätt på mig" doneTodayInitial={dashboard.today.dressed} data={dashboard.series30d.dressed} />
          <ToggleCard kind="medication" label="Tagit min medicin" doneTodayInitial={dashboard.today.medication} data={dashboard.series30d.medication} />
          <ToggleCard kind="screen_free" label="Skärmfri stund" doneTodayInitial={dashboard.today.screen_free} data={dashboard.series30d.screen_free} />
          <ToggleCard kind="recovery" label="Tid för återhämtning" doneTodayInitial={dashboard.today.recovery} data={dashboard.series30d.recovery} />
        </div>

        <Divider />

        <SectionHeader title="Socialt" sub="Möten, samtal, kontakt." />
        <div className={s.metricGridWide}>
          <SocialCard todayInitial={dashboard.today.social} data={dashboard.series30d.social} />
        </div>

        <Divider />

        <SectionHeader title="Substanser" sub="Utan dom — bara siffror." />
        <div className={s.metricGrid}>
          <CountCard kind="caffeine" label="Koffein" unit="koppar" todayInitial={dashboard.today.caffeine} avg7d={dashboard.avg7d.caffeinePerDay} data={dashboard.series30d.caffeine} />
          <CountCard kind="alcohol" label="Alkohol" unit="glas" todayInitial={dashboard.today.alcohol} avg7d={dashboard.avg7d.alcoholPerDay} data={dashboard.series30d.alcohol} />
          <CountCard kind="nicotine" label="Nikotin" unit="ggr" todayInitial={dashboard.today.nicotine} avg7d={dashboard.avg7d.nicotinePerDay} data={dashboard.series30d.nicotine} />
          <CountCard kind="drugs" label="Droger" unit="ggr" todayInitial={dashboard.today.drugs} avg7d={dashboard.avg7d.drugsPerDay} data={dashboard.series30d.drugs} />
        </div>
      </main>

      <aside className={s.rightCol}>
        <ProgressCard dashboard={dashboard} />
        <RecentEntries dashboard={dashboard} />
        <InsightCard />
      </aside>
    </div>
  )
}

/* ============================================================
   Empty state (zero entries)
   ============================================================ */
function EmptyState({ dashboard }: { dashboard: DashboardSummary }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const firstName = dashboard.displayName.split(' ')[0]
  return (
    <div className={s.empty}>
      <h1 className={s.emptyTitle}>Välkommen, {firstName}.</h1>
      <p className={s.emptyLead}>
        moodmap är din egen plats för att lägga märke till hur du mår. Ingen
        rankning, inga streaks — bara små incheckningar när du har lust.
      </p>
      <p className={s.emptyLead}>
        Det enklaste sättet att börja är att logga ditt humör just nu.
      </p>
      <button
        type="button"
        className={`${s.btn} ${s.btnPrimary} ${s.emptyCta}`}
        onClick={() => setOpen(true)}
      >
        Börja med en liten incheckning
      </button>
      <LogSliderModal
        open={open}
        onClose={() => setOpen(false)}
        metric="mood"
        title="Hur mår du just nu?"
        ariaLabel="Humör"
        onSave={async ({ value, note }) => {
          await createSliderEntry({
            data: { metric: 'mood', value, note: note || undefined },
          })
          await router.invalidate()
        }}
      />
    </div>
  )
}

/* ============================================================
   Topbar + section helpers
   ============================================================ */
const GREETING_PREFIX: Record<DashboardSummary['partOfDay'], string> = {
  morgon: 'God morgon',
  dag: 'Hej',
  kväll: 'God kväll',
  natt: 'God natt',
}

function Topbar({ dashboard }: { dashboard: DashboardSummary }) {
  const firstName = dashboard.displayName.split(' ')[0]
  const [logOpen, setLogOpen] = useState(false)
  return (
    <header className={s.topbar}>
      <div className={s.greet}>
        <h1>{GREETING_PREFIX[dashboard.partOfDay]}, {firstName}.</h1>
        <p>
          {dashboard.todayLabel} · Du har loggat {dashboard.loggedDaysLast30} av de senaste 30 dagarna.
        </p>
      </div>
      <div className={s.topActions}>
        <button className={`${s.btn} ${s.btnGhost}`}>Exportera</button>
        <Link to="/historik" className={s.btn}>Visa historik</Link>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setLogOpen(true)}>+ Ny incheckning</button>
      </div>
      <LogAnythingModal open={logOpen} onClose={() => setLogOpen(false)} />
    </header>
  )
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className={s.sectionHead}>
      <h2 className={s.sectionTitle}>{title}</h2>
      {sub ? <p className={s.sectionSub}>{sub}</p> : null}
    </div>
  )
}

function Divider() {
  return <div className={s.divider} />
}

/* ============================================================
   Top stats row
   ============================================================ */
function Stat({
  label,
  value,
  unit,
  delta,
  accent = false,
}: {
  label: string
  value: string
  unit?: string
  delta?: string
  accent?: boolean
}) {
  return (
    <div className={s.stat}>
      <div className={s.statKey}>{label}</div>
      <div className={`${s.statValue} ${accent ? s.statValueAccent : ''}`}>
        {value}
        {unit ? <span className={s.unit}>{unit}</span> : null}
      </div>
      {delta ? <div className={s.statDelta}>{delta}</div> : null}
    </div>
  )
}

function formatSv(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toFixed(digits).replace('.', ',')
}

function StatsRow({ dashboard }: { dashboard: DashboardSummary }) {
  const water = dashboard.stats.waterToday
  return (
    <div className={s.stats}>
      <Stat label="Snitthumör · 7d" value={formatSv(dashboard.stats.moodAvg7d)} unit="/10" />
      <Stat label="Sömn · 7d" value={formatSv(dashboard.stats.sleepHoursAvg7d)} unit="h" />
      <Stat
        label="Vatten · idag"
        value={String(water)}
        unit="glas"
        delta={water < 8 ? `Mål 8 glas` : 'Mål uppnått'}
        accent={water < 8}
      />
      <Stat
        label="Incheckningar · 30d"
        value={String(dashboard.stats.checkinsLast30)}
        delta="Allt räknas"
      />
    </div>
  )
}

/* ============================================================
   Combined chart
   ============================================================ */
const SHORT_MONTH_SV = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

function xAxisDates(days: number): string[] {
  const out: string[] = []
  for (let k = 0; k < 5; k++) {
    const offset = Math.round((days - 1) * (1 - k / 4))
    const d = new Date()
    d.setDate(d.getDate() - offset)
    out.push(`${d.getDate()} ${SHORT_MONTH_SV[d.getMonth()]}`)
  }
  return out
}

function chartPoints(values: number[], max: number): string {
  const w = 600
  const topY = 20
  const bottomY = 200
  const innerH = bottomY - topY
  const n = values.length
  if (n === 0) return ''
  const step = n > 1 ? w / (n - 1) : w
  return values
    .map((v, i) => {
      const clamped = Math.max(0, Math.min(max, v))
      const y = bottomY - (clamped / max) * innerH
      return `${(i * step).toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

const CHART_RANGES = [
  { days: 7, tab: '7d', heading: '7 dagar' },
  { days: 30, tab: '30d', heading: '30 dagar' },
  { days: 90, tab: '90d', heading: '90 dagar' },
  { days: 365, tab: '1år', heading: '1 år' },
] as const

function CombinedChartCard({ dashboard }: { dashboard: DashboardSummary }) {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<ChartSeries>({ days: 30, ...dashboard.series30d })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (days === 30) {
      setData({ days: 30, ...dashboard.series30d })
      return
    }
    let cancelled = false
    setLoading(true)
    getChartSeries({ data: { days } })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [days, dashboard.series30d])

  const heading = CHART_RANGES.find((r) => r.days === days)?.heading ?? `${days} dagar`
  const series = [
    { name: 'Humör', color: METRIC_COLORS.mood, values: data.mood, points: chartPoints(data.mood, 10) },
    { name: 'Energi', color: METRIC_COLORS.energy, values: data.energy, points: chartPoints(data.energy, 10) },
    { name: 'Sömn', color: METRIC_COLORS.sleep, values: data.sleepHours, points: chartPoints(data.sleepHours, 12) },
    { name: 'Ångest', color: METRIC_COLORS.anxiety, values: data.anxiety, points: chartPoints(data.anxiety, 10) },
    { name: 'Stress', color: METRIC_COLORS.stress, values: data.stress, points: chartPoints(data.stress, 10) },
    { name: 'Koncentration', color: METRIC_COLORS.concentration, values: data.concentration, points: chartPoints(data.concentration, 10) },
  ].map((sr) => ({ ...sr, hasData: sr.values.some((v) => v > 0) }))

  return (
    <div className={s.card} style={{ marginTop: 20 }}>
      <div className={s.chartHead}>
        <div>
          <h2>Allt på en gång · {heading}</h2>
          <div className={s.cardSub} style={{ marginBottom: 0 }}>
            Alla mått, sida vid sida. Tryck på en serie för att fokusera.
          </div>
        </div>
        <div className={s.tabs}>
          {CHART_RANGES.map((r) => (
            <button
              key={r.days}
              className={days === r.days ? s.tabOn : undefined}
              onClick={() => setDays(r.days)}
            >
              {r.tab}
            </button>
          ))}
        </div>
      </div>

      <div className={s.legend}>
        {series.map((sr) => (
          <span key={sr.name}>
            <span className={s.legendDot} style={{ background: sr.color }} /> {sr.name}
          </span>
        ))}
      </div>

      <div className={s.chart} style={{ opacity: loading ? 0.5 : 1 }}>
        <svg viewBox="0 0 600 220" preserveAspectRatio="none">
          <g stroke="#EFEFEA" strokeWidth="1">
            <line x1="0" y1="44" x2="600" y2="44" />
            <line x1="0" y1="110" x2="600" y2="110" />
            <line x1="0" y1="176" x2="600" y2="176" />
          </g>
          {series.some((sr) => sr.hasData) ? (
            series
              .filter((sr) => sr.hasData)
              .map((sr) => (
                <polyline
                  key={sr.name}
                  fill="none"
                  style={{ stroke: sr.color }}
                  strokeWidth={sr.name === 'Humör' ? 2.5 : 1.8}
                  points={sr.points}
                />
              ))
          ) : (
            <line x1="0" y1="200" x2="600" y2="200" stroke="#2b2d3a" strokeWidth="2" />
          )}
        </svg>
      </div>
      <div className={s.xaxis}>
        {xAxisDates(days).map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   Sparkline + dot-strip primitives
   ============================================================ */
function Sparkline({
  data,
  color = 'var(--accent)',
  max = 10,
  min = 0,
}: { data: number[]; color?: string; max?: number; min?: number }) {
  const w = 300
  const h = 60
  const padY = 4
  const innerH = h - padY * 2
  const range = Math.max(0.0001, max - min)
  const step = data.length > 1 ? w / (data.length - 1) : w
  const points = data
    .map((v, i) => {
      const y = padY + innerH - ((v - min) / range) * innerH
      return `${(i * step).toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={s.spark}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        style={{ stroke: color }}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        points={points}
      />
    </svg>
  )
}

function DotStrip({ data }: { data: boolean[] }) {
  return (
    <div className={s.dotStrip} aria-hidden="true">
      {data.map((on, i) => (
        <span
          key={i}
          className={on ? `${s.dot} ${s.dotOn}` : s.dot}
        />
      ))}
    </div>
  )
}

/* ============================================================
   Mental wellbeing cards
   ============================================================ */
function SliderMetricCard({
  label,
  today,
  avg7d,
  color = 'var(--accent)',
  data,
  onLog,
}: {
  label: string
  today: number | null
  avg7d: number | null
  color?: string
  data: number[]
  onLog?: () => void
}) {
  return (
    <div className={s.metricCard}>
      <div className={s.metricHead}>
        <h3>
          <span className={s.metricDot} style={{ background: color }} />
          {label}
        </h3>
        <span className={s.metricToday}>
          {today === null ? '—' : formatSv(today)}
          <span className={s.metricUnit}>/10</span>
        </span>
      </div>
      <Sparkline data={data} color={color} max={10} />
      <div className={s.metricFoot}>
        <span className={s.metricAvg}>Snitt 7d · {avg7d === null ? '—' : formatSv(avg7d)}</span>
        <button className={`${s.btn} ${s.btnSmall}`} onClick={onLog}>Logga</button>
      </div>
    </div>
  )
}

function MoodCard({ today, avg7d, data }: { today: number | null; avg7d: number | null; data: number[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  return (
    <>
      <SliderMetricCard
        label="Humör"
        today={today}
        avg7d={avg7d}
        color={METRIC_COLORS.mood}
        data={data}
        onLog={() => setOpen(true)}
      />
      <LogSliderModal
        open={open}
        onClose={() => setOpen(false)}
        metric="mood"
        title="Hur mår du idag?"
        ariaLabel="Humör"
        onSave={async ({ value, note }) => {
          await createSliderEntry({
            data: { metric: 'mood', value, note: note || undefined },
          })
          await router.invalidate()
        }}
      />
    </>
  )
}
function EnergyCard({ today, avg7d, data }: { today: number | null; avg7d: number | null; data: number[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  return (
    <>
      <SliderMetricCard
        label="Energi"
        today={today}
        avg7d={avg7d}
        color={METRIC_COLORS.energy}
        data={data}
        onLog={() => setOpen(true)}
      />
      <LogSliderModal
        open={open}
        onClose={() => setOpen(false)}
        metric="energy"
        title="Hur är energinivån?"
        ariaLabel="Energi"
        onSave={async ({ value, note }) => {
          await createSliderEntry({
            data: { metric: 'energy', value, note: note || undefined },
          })
          await router.invalidate()
        }}
      />
    </>
  )
}
function AnxietyCard({ today, avg7d, data }: { today: number | null; avg7d: number | null; data: number[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  return (
    <>
      <SliderMetricCard
        label="Ångest"
        today={today}
        avg7d={avg7d}
        color={METRIC_COLORS.anxiety}
        data={data}
        onLog={() => setOpen(true)}
      />
      <LogSliderModal
        open={open}
        onClose={() => setOpen(false)}
        metric="anxiety"
        title="Hur mycket ångest känner du?"
        ariaLabel="Ångest"
        onSave={async ({ value, note }) => {
          await createSliderEntry({
            data: { metric: 'anxiety', value, note: note || undefined },
          })
          await router.invalidate()
        }}
      />
    </>
  )
}
function StressCard({ today, avg7d, data }: { today: number | null; avg7d: number | null; data: number[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  return (
    <>
      <SliderMetricCard
        label="Stress"
        today={today}
        avg7d={avg7d}
        color={METRIC_COLORS.stress}
        data={data}
        onLog={() => setOpen(true)}
      />
      <LogSliderModal
        open={open}
        onClose={() => setOpen(false)}
        metric="stress"
        title="Hur stressad är du?"
        ariaLabel="Stress"
        onSave={async ({ value, note }) => {
          await createSliderEntry({
            data: { metric: 'stress', value, note: note || undefined },
          })
          await router.invalidate()
        }}
      />
    </>
  )
}
function ConcentrationCard({ today, avg7d, data }: { today: number | null; avg7d: number | null; data: number[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  return (
    <>
      <SliderMetricCard
        label="Koncentration"
        today={today}
        avg7d={avg7d}
        color={METRIC_COLORS.concentration}
        data={data}
        onLog={() => setOpen(true)}
      />
      <LogSliderModal
        open={open}
        onClose={() => setOpen(false)}
        metric="concentration"
        title="Hur lätt är det att koncentrera sig?"
        ariaLabel="Koncentration"
        onSave={async ({ value, note }) => {
          await createSliderEntry({
            data: { metric: 'concentration', value, note: note || undefined },
          })
          await router.invalidate()
        }}
      />
    </>
  )
}

function SleepCard({
  hoursToday,
  avg7dHours,
  data,
}: {
  hoursToday: number | null
  avg7dHours: number | null
  data: number[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState(hoursToday ?? 8)

  useEffect(() => {
    if (open) setHours(hoursToday ?? 8)
  }, [open, hoursToday])

  const clampHours = (n: number) => Math.max(0, Math.min(24, Math.round(n * 2) / 2))
  const shownHours = hoursToday ?? avg7dHours

  return (
    <div className={s.metricCard}>
      <div className={s.metricHead}>
        <h3>
          <span className={s.metricDot} style={{ background: METRIC_COLORS.sleep }} />
          Sömn
        </h3>
        <span className={s.metricToday}>
          {shownHours === null ? '—' : formatSv(shownHours)}
          <span className={s.metricUnit}>h</span>
        </span>
      </div>
      <Sparkline data={data} color={METRIC_COLORS.sleep} max={12} />
      <div className={s.sleepRow}>
        <div>
          <span className={s.metricAvg}>
            Snitt 7d · {avg7dHours === null ? '—' : `${formatSv(avg7dHours)} h`}
          </span>
        </div>
        <button className={`${s.btn} ${s.btnSmall}`} onClick={() => setOpen(true)}>Logga</button>
      </div>

      <LogSliderModal
        open={open}
        onClose={() => setOpen(false)}
        metric="sleep"
        title="Hur sov du inatt?"
        ariaLabel="Sömnkvalitet"
        onSave={async ({ value, note }) => {
          await createSleepEntry({
            data: { quality: value, hours, note: note || undefined },
          })
          await router.invalidate()
        }}
      >
        <div className={modalS.hoursRow}>
          <h4 className={modalS.hoursLabel}>Antal timmar:</h4>
          <div className={modalS.hoursControl}>
            <button
              type="button"
              className={modalS.hoursBtn}
              aria-label="Minska"
              disabled={hours <= 0}
              onClick={() => setHours((h) => clampHours(h - 0.5))}
            >
              −
            </button>
            <input
              type="number"
              className={modalS.hoursInput}
              min={0}
              max={24}
              step={0.5}
              value={hours}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (Number.isFinite(n)) setHours(clampHours(n))
              }}
              aria-label="Antal timmar sömn"
            />
            <button
              type="button"
              className={modalS.hoursBtn}
              aria-label="Öka"
              disabled={hours >= 24}
              onClick={() => setHours((h) => clampHours(h + 0.5))}
            >
              +
            </button>
          </div>
        </div>
      </LogSliderModal>
    </div>
  )
}

/* ============================================================
   Physical cards
   ============================================================ */
function PhysicalCard({
  kind,
  label,
  unit,
  today,
  goal,
  presets,
  data,
  max,
  color = '#6B6B6B',
}: {
  kind: PhysicalKind
  label: string
  unit: string
  today: number
  goal?: string
  presets: number[]
  data: number[]
  max: number
  color?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(0)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const shown = today + pending

  useEffect(() => {
    setPending(0)
  }, [today])

  async function add(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0 || saving) return
    const rounded = Math.round(amount)
    if (rounded <= 0) return
    setSaving(true)
    setPending((p) => p + rounded)
    try {
      await createPhysicalEntry({ data: { kind, amount: rounded } })
      setDraft('')
      await router.invalidate()
    } catch {
      setPending((p) => p - rounded)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={s.metricCard}>
      <div className={s.metricHead}>
        <h3>
          <span className={s.metricDot} style={{ background: color }} />
          {label}
        </h3>
        <span className={s.metricToday}>
          {shown}<span className={s.metricUnit}>{unit}</span>
        </span>
      </div>
      <Sparkline data={data} color={color} max={max} />
      <div className={s.metricFoot}>
        <span className={s.metricAvg}>{goal}</span>
        <div className={s.inlineForm}>
          <input
            className={s.inlineInput}
            placeholder="+"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft) add(Number(draft))
            }}
            disabled={saving}
          />
          <button
            type="button"
            className={`${s.btn} ${s.btnSmall} ${s.btnPrimary}`}
            disabled={saving || !draft}
            onClick={() => add(Number(draft))}
          >
            Lägg till
          </button>
        </div>
      </div>
      <div className={s.quickChips}>
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            className={s.chip}
            disabled={saving}
            onClick={() => add(p)}
          >
            +{p} {unit}
          </button>
        ))}
      </div>
    </div>
  )
}

function avgGoalLabel(avg7d: number | null, unit: string): string {
  if (avg7d === null || avg7d === 0) return 'Snitt 7d · —'
  return `Snitt 7d · ${formatSv(avg7d, 0)} ${unit}`
}

type PhysicalCardProps = { today: number; avg7d: number | null; data: number[] }

function WaterCard({ today, avg7d, data }: PhysicalCardProps) {
  const goal =
    avg7d && avg7d > 0 ? `Snitt 7d · ${formatSv(avg7d, 0)}` : 'Mål 8 glas'
  return (
    <PhysicalCard
      kind="water"
      label="Vatten"
      unit="glas"
      today={today}
      goal={goal}
      presets={[1, 2]}
      data={data}
      max={Math.max(10, ...data)}
      color={METRIC_COLORS.water}
    />
  )
}
function ExerciseCard({ today, avg7d, data }: PhysicalCardProps) {
  return (
    <PhysicalCard
      kind="exercise"
      label="Träning"
      unit="min"
      today={today}
      goal={avgGoalLabel(avg7d, 'min')}
      presets={[15, 30, 45]}
      data={data}
      max={Math.max(60, ...data)}
      color={METRIC_COLORS.exercise}
    />
  )
}
function SunlightCard({ today, avg7d, data }: PhysicalCardProps) {
  return (
    <PhysicalCard
      kind="daylight"
      label="Dagsljus"
      unit="min"
      today={today}
      goal={avgGoalLabel(avg7d, 'min')}
      presets={[10, 20, 30]}
      data={data}
      max={Math.max(90, ...data)}
      color={METRIC_COLORS.daylight}
    />
  )
}

/* ============================================================
   Self-care toggle cards
   ============================================================ */
function ToggleCard({
  kind,
  label,
  doneTodayInitial,
  data,
}: { kind: SelfCareKind; label: string; doneTodayInitial: boolean; data: boolean[] }) {
  const router = useRouter()
  const [doneToday, setDoneToday] = useState(doneTodayInitial)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setDoneToday(doneTodayInitial)
  }, [doneTodayInitial])
  const count = data.filter(Boolean).length + (doneToday && !doneTodayInitial ? 1 : 0)

  async function mark() {
    if (doneToday || saving) return
    setSaving(true)
    setDoneToday(true)
    try {
      await markSelfCare({ data: { kind } })
      await router.invalidate()
    } catch {
      setDoneToday(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={s.metricCard}>
      <div className={s.metricHead}>
        <h3>{label}</h3>
        <span className={s.metricToday}>
          {count}<span className={s.metricUnit}>/30 dgr</span>
        </span>
      </div>
      <DotStrip data={doneToday && !doneTodayInitial ? [...data.slice(0, -1), true] : data} />
      <div className={s.metricFoot}>
        <span className={s.metricAvg}>{doneToday ? 'Klar för idag' : 'Inte ännu idag'}</span>
        <button
          type="button"
          className={`${s.btn} ${s.btnSmall} ${doneToday ? '' : s.btnPrimary}`}
          disabled={doneToday || saving}
          onClick={mark}
        >
          {doneToday ? '✓ Klart' : 'Markera klar'}
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   Meals card (per-meal toggles)
   ============================================================ */
function MealsCard({
  today,
  data,
}: {
  today: Record<MealKind, boolean>
  data: Record<MealKind, boolean[]>
}) {
  const router = useRouter()
  const [done, setDone] = useState(today)
  const [saving, setSaving] = useState<MealKind | null>(null)
  useEffect(() => {
    setDone(today)
  }, [today])

  const meals: { kind: MealKind; label: string }[] = [
    { kind: 'ate_breakfast', label: 'Frukost' },
    { kind: 'ate_lunch', label: 'Lunch' },
    { kind: 'ate_dinner', label: 'Middag' },
  ]
  const doneCount = meals.filter((m) => done[m.kind]).length
  const perDay = data.ate_breakfast.map(
    (_, i) =>
      Number(data.ate_breakfast[i]) +
      Number(data.ate_lunch[i]) +
      Number(data.ate_dinner[i]),
  )
  const series =
    perDay.length > 0 ? [...perDay.slice(0, -1), doneCount] : perDay
  const last7 = series.slice(-7)
  const avg7d = last7.length > 0 ? last7.reduce((a, b) => a + b, 0) / last7.length : 0
  const goal = avg7d > 0 ? `Snitt 7d · ${formatSv(avg7d, 1)} av 3` : 'Mål: 3 mål/dag'

  async function mark(kind: MealKind) {
    if (done[kind] || saving) return
    setSaving(kind)
    setDone((d) => ({ ...d, [kind]: true }))
    try {
      await markSelfCare({ data: { kind } })
      await router.invalidate()
    } catch {
      setDone((d) => ({ ...d, [kind]: false }))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className={s.metricCard}>
      <div className={s.metricHead}>
        <h3>
          <span className={s.metricDot} style={{ background: METRIC_COLORS.meals }} />
          Måltider
        </h3>
        <span className={s.metricToday}>
          {doneCount}<span className={s.metricUnit}>/3 idag</span>
        </span>
      </div>
      <Sparkline data={series} color={METRIC_COLORS.meals} max={3} />
      <div className={s.metricFoot}>
        <span className={s.metricAvg}>{goal}</span>
      </div>
      <div className={s.quickChips}>
        {meals.map((m) => (
          <button
            key={m.kind}
            type="button"
            className={`${s.chip} ${done[m.kind] ? s.chipActive : ''}`}
            disabled={done[m.kind] || saving !== null}
            onClick={() => mark(m.kind)}
          >
            {done[m.kind] ? '✓ ' : '+ '}{m.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   Social card
   ============================================================ */
function SocialCard({ todayInitial, data }: { todayInitial: number; data: number[] }) {
  const router = useRouter()
  const [today, setToday] = useState(todayInitial)
  const [saving, setSaving] = useState<SocialRelation | null>(null)
  useEffect(() => {
    setToday(todayInitial)
  }, [todayInitial])

  const relations: { kind: SocialRelation; label: string }[] = [
    { kind: 'family', label: 'Familj' },
    { kind: 'friend', label: 'Vän' },
    { kind: 'partner', label: 'Partner' },
    { kind: 'colleague', label: 'Kollega' },
    { kind: 'neighbor', label: 'Granne' },
    { kind: 'pet', label: 'Husdjur' },
    { kind: 'care', label: 'Vårdkontakt' },
    { kind: 'online', label: 'Online' },
    { kind: 'stranger', label: 'Annan' },
  ]

  async function log(relation: SocialRelation) {
    if (saving) return
    setSaving(relation)
    setToday((n) => n + 1)
    try {
      await logSocialInteraction({ data: { relation } })
      await router.invalidate()
    } catch {
      setToday((n) => Math.max(0, n - 1))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className={s.metricCard}>
      <div className={s.metricHead}>
        <h3>
          <span className={s.metricDot} style={{ background: METRIC_COLORS.social }} />
          Sociala interaktioner
        </h3>
        <span className={s.metricToday}>
          {today}<span className={s.metricUnit}>idag</span>
        </span>
      </div>
      <Sparkline data={data} color={METRIC_COLORS.social} max={Math.max(5, ...data)} />
      <div className={s.socialRow}>
        <div className={s.socialChips}>
          {relations.map((r) => (
            <button
              key={r.kind}
              type="button"
              className={s.chip}
              disabled={saving !== null}
              onClick={() => log(r.kind)}
            >
              + {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Substance count card
   ============================================================ */
function CountCard({
  kind,
  label,
  unit,
  todayInitial,
  avg7d,
  data,
}: {
  kind: SubstanceKind
  label: string
  unit: string
  todayInitial: number
  avg7d: number | null
  data: number[]
}) {
  const router = useRouter()
  const [today, setToday] = useState(todayInitial)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setToday(todayInitial)
  }, [todayInitial])

  async function add() {
    if (saving) return
    setSaving(true)
    setToday((n) => n + 1)
    try {
      await logSubstance({ data: { kind } })
      await router.invalidate()
    } catch {
      setToday((n) => Math.max(0, n - 1))
    } finally {
      setSaving(false)
    }
  }

  async function undo() {
    if (saving || today <= 0) return
    setSaving(true)
    setToday((n) => Math.max(0, n - 1))
    try {
      const res = await undoSubstance({ data: { kind } })
      if (!res.undone) setToday((n) => n + 1)
      await router.invalidate()
    } catch {
      setToday((n) => n + 1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={s.metricCard}>
      <div className={s.metricHead}>
        <h3>
          <span className={s.metricDot} style={{ background: METRIC_COLORS[kind] }} />
          {label}
        </h3>
        <span className={s.metricToday}>
          {today}<span className={s.metricUnit}>{unit}</span>
        </span>
      </div>
      <Sparkline data={data} color={METRIC_COLORS[kind]} max={Math.max(...data, 3)} />
      <div className={s.metricFoot}>
        <span className={s.metricAvg}>
          Snitt 7d · {avg7d === null ? '—' : formatSv(avg7d)}
        </span>
        <div className={s.stepRow}>
          <button
            type="button"
            className={s.stepBtn}
            aria-label="Ångra senaste"
            disabled={saving || today <= 0}
            onClick={undo}
          >
            −
          </button>
          <button
            type="button"
            className={s.stepBtn}
            aria-label="Lägg till"
            disabled={saving}
            onClick={add}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Right sidebar
   ============================================================ */
function ProgressCard({ dashboard }: { dashboard: DashboardSummary }) {
  const logged = dashboard.loggedDaysLast30
  const pct = Math.max(0, Math.min(100, Math.round((logged / 30) * 100)))
  const headline =
    logged === 0 ? 'En bra dag att börja.' : logged < 8 ? 'En fin start.' : logged < 20 ? 'Du gör det bra.' : 'Imponerande närvaro.'
  const tail =
    logged < 8
      ? 'Några dagar till och mönster börjar synas.'
      : 'Det räcker för att börja se mönster.'
  return (
    <div className={s.card}>
      <h2>Den här månaden</h2>
      <p className={s.cardSub}>Inga streaks här. Det räknas att dyka upp.</p>
      <div className={s.ringRow}>
        <div className={s.ring}>
          <svg viewBox="0 0 36 36" width="84" height="84">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#EFEFEA" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none" stroke="#F7339A" strokeWidth="3"
              strokeDasharray={`${pct} 100`} strokeDashoffset="25"
              strokeLinecap="round" transform="rotate(-90 18 18)"
            />
          </svg>
          <div className={s.ringBig}>{logged}/30</div>
        </div>
        <div className={s.ringMeta}>
          <b>{headline}</b>
          <p>Loggat {logged} av de senaste 30 dagarna. {tail}</p>
        </div>
      </div>
    </div>
  )
}

const SHORT_WEEKDAY_SV = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör']

function formatEntryDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${SHORT_WEEKDAY_SV[d.getDay()]} · ${d.getDate()}`
}

function RecentEntries({ dashboard }: { dashboard: DashboardSummary }) {
  const router = useRouter()
  const rows = dashboard.recent.slice(0, 5)
  const [editingId, setEditingId] = useState<string | null>(null)
  return (
    <div className={s.card}>
      <h2>Senaste incheckningarna</h2>
      <p className={s.cardSub}>
        {rows.length === 0
          ? 'Inga incheckningar än. Börja med en liten — vad som helst räknas.'
          : 'Tryck på en rad för att redigera anteckningen eller ta bort.'}
      </p>
      <div className={s.recent}>
        {rows.map((r) => (
          <button
            type="button"
            className={`${s.entry} ${s.entryButton}`}
            key={r.id}
            onClick={() => setEditingId(r.id)}
          >
            <span className={s.entryDay}>{formatEntryDay(r.loggedFor)}</span>
            <span className={s.entryText}>{r.note ?? <em style={{ color: 'var(--muted)' }}>{r.summary || 'Ingen anteckning'}</em>}</span>
            <span className={s.entryNum}>{r.note ? r.summary : ''}</span>
          </button>
        ))}
      </div>
      {rows.length > 0 ? (
        <div className={s.cardFoot}>
          <Link to="/historik" className={`${s.btn} ${s.btnGhost}`}>
            Visa alla →
          </Link>
        </div>
      ) : null}
      <EntryEditModal
        open={editingId !== null}
        entryId={editingId}
        onClose={() => setEditingId(null)}
        onChanged={() => router.invalidate()}
      />
    </div>
  )
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return `Sammanfattat ${time}`
  const date = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
  return `Sammanfattat ${date} · ${time}`
}

function PatternLine() {
  const [pattern, setPattern] = useState<PatternResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getPatternObservation({ data: {} })
      .then((res) => {
        if (!cancelled) setPattern(res)
      })
      .catch(() => {
        if (!cancelled) setPattern(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !pattern) return null

  return (
    <div className={s.patternLine}>
      <span className={s.patternLabel}>Mönster</span>
      <p className={s.insight}>{pattern.content}</p>
    </div>
  )
}

function InsightCard() {
  const [summary, setSummary] = useState<SummaryResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getWeeklySummary({ data: {} })
      .then((res) => {
        if (!cancelled) setSummary(res)
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
      const res = await getWeeklySummary({ data: { force: true } })
      setSummary(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className={`${s.card} ${s.insightCard}`}>
      <div className={s.insightHead}>
        <h2>Den här veckan</h2>
        <span className={s.aiPill}>AI</span>
      </div>
      <p className={s.cardSub} style={{ marginBottom: 10 }}>
        En sammanfattning av de senaste sju dagarna.
      </p>
      {loading ? (
        <p className={s.insight}>Läser igenom veckan…</p>
      ) : error ? (
        <p className={s.insight}>Det gick inte att hämta sammanfattningen just nu. {error}</p>
      ) : summary ? (
        <p className={s.insight}>{summary.content}</p>
      ) : null}
      {!loading && !error && summary ? <PatternLine /> : null}
      <div className={s.cardFoot} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className={s.metricAvg}>
          {summary ? formatTimestamp(summary.generated_at) : ''}
        </span>
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
