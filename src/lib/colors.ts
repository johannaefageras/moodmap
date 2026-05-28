export const METRIC_COLORS = {
  mood: 'var(--metric-mood)',
  anxiety: 'var(--metric-anxiety)',
  stress: 'var(--metric-stress)',
  daylight: 'var(--metric-daylight)',
  energy: 'var(--metric-energy)',
  exercise: 'var(--metric-exercise)',
  water: 'var(--metric-water)',
  sleep: 'var(--metric-sleep)',
  social: 'var(--metric-social)',
  concentration: 'var(--metric-concentration)',
  alcohol: 'var(--metric-alcohol)',
  drugs: 'var(--metric-drugs)',
  nicotine: 'var(--metric-nicotine)',
  caffeine: 'var(--metric-caffeine)',
} as const

export type MetricKey = keyof typeof METRIC_COLORS
