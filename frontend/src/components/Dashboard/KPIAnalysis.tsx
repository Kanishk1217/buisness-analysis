import { useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Button }       from '../UI/Button'
import { Spinner }      from '../UI/Spinner'
import { InsightPanel } from '../UI/InsightPanel'
import { fmt, fmtAxis, fmtGrowth } from '../../utils/format'
import type { UploadResponse, KpiResponse } from '../../types'

function AnomalyDot(props: Record<string, unknown>) {
  const { cx, cy, index, anomalyIndices } = props as { cx: number; cy: number; index: number; anomalyIndices: number[] }
  if (!anomalyIndices?.includes(index)) return null
  return <circle cx={cx} cy={cy} r={4} fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle:   { color: '#a1a1aa' },
  itemStyle:    { color: '#fafafa' },
}

interface Props {
  data:      UploadResponse
  kpiResult: KpiResponse | null
  loading:   boolean
  error:     string | null
  onRun:     (columns: string[], window: number) => void
}

function buildKPINote(
  col: string,
  res: KpiResponse[string],
  window: number,
  anomalyIndices: number[],
): string {
  const parts: string[] = []

  // Average and range
  parts.push(
    `${col} averaged ${fmt(res.mean)} per period, ranging from ${fmt(res.min)} to ${fmt(res.max)} (total: ${fmt(res.total)}).`
  )

  // Moving average interpretation
  const values = res.values
  const ma     = res.moving_avg
  const validMA = ma.filter((v) => v !== null && v !== undefined) as number[]
  if (validMA.length >= 2) {
    const first = validMA[0]
    const last  = validMA[validMA.length - 1]
    const maTrend = last > first ? 'rising' : last < first ? 'falling' : 'flat'
    const maChange = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0
    parts.push(
      `The ${window}-period moving average is ${maTrend}${Math.abs(maChange) > 1 ? ` (${maChange > 0 ? '+' : ''}${maChange.toFixed(1)}% from start to end)` : ''} — this smoothed line removes noise and shows the real direction.`
    )
  }

  // Growth interpretation
  const growthValues = res.growth_pct.filter((v) => v !== null) as number[]
  if (growthValues.length > 0) {
    const posCount = growthValues.filter((v) => v > 0).length
    const negCount = growthValues.filter((v) => v < 0).length
    const avgGrowth = growthValues.reduce((a, b) => a + b, 0) / growthValues.length
    const latest = res.growth_pct.filter((v) => v !== null).slice(-1)[0]
    if (posCount > negCount) {
      parts.push(`Growth has been mostly positive — ${posCount} up periods vs ${negCount} down periods. Average period change: ${avgGrowth > 0 ? '+' : ''}${avgGrowth.toFixed(1)}%.`)
    } else if (negCount > posCount) {
      parts.push(`Growth has been mostly negative — ${negCount} down periods vs ${posCount} up periods. This warrants attention.`)
    } else {
      parts.push(`Growth has been mixed — equal positive and negative periods. Average change: ${avgGrowth > 0 ? '+' : ''}${avgGrowth.toFixed(1)}%.`)
    }
    if (latest !== null && latest !== undefined) {
      parts.push(`Latest period change: ${fmtGrowth(latest)}.`)
    }
  }

  // Anomaly interpretation
  if (anomalyIndices.length > 0) {
    const pct = values.length > 0 ? ((anomalyIndices.length / values.length) * 100).toFixed(1) : '0'
    parts.push(
      `${anomalyIndices.length} anomal${anomalyIndices.length === 1 ? 'y' : 'ies'} detected (${pct}% of periods, shown as white dots). These are statistically unusual values — investigate whether they represent real events or data errors.`
    )
  } else {
    parts.push('No anomalies detected — values stayed within expected statistical bounds throughout.')
  }

  return parts.join(' ')
}

function buildGrowthNote(res: KpiResponse[string]): string {
  const growthValues = res.growth_pct.filter((v) => v !== null) as number[]
  if (!growthValues.length) return ''
  const max = Math.max(...growthValues)
  const min = Math.min(...growthValues)
  const range = max - min
  if (range > 40) return `Growth rate is highly volatile — ranging from ${min.toFixed(1)}% to +${max.toFixed(1)}%. Large swings suggest irregular performance or seasonal effects.`
  if (range > 15) return `Growth rate varies moderately (${min.toFixed(1)}% to +${max.toFixed(1)}%). Look for patterns — are the dips always at the same period?`
  return `Growth rate is relatively stable (${min.toFixed(1)}% to +${max.toFixed(1)}%) — consistent, predictable performance.`
}

export function KPIAnalysis({ data, kpiResult, loading, error, onRun }: Props) {
  const recommended = data.recommendations?.kpi ?? []
  const allCols     = recommended.length > 0 ? recommended : data.numeric_cols.slice(0, 5)

  const [selected, setSelected] = useState<string[]>(allCols.slice(0, 3))
  const [window,   setWindow]   = useState(3)

  const toggle = (col: string) => {
    setSelected((prev) => prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col])
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <InsightPanel insights={data.insights?.kpi ?? []} />

      {/* Column selector */}
      <div className="glass p-4 space-y-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">Select KPI Columns to Analyze</p>
        <div className="flex flex-wrap gap-2">
          {allCols.map((col) => (
            <button
              key={col}
              onClick={() => toggle(col)}
              className={`px-3 py-1 text-xs font-mono border transition-colors
                ${selected.includes(col) ? 'border-primary text-primary' : 'border-border text-dim hover:border-dim'}`}
            >
              {col}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 pt-2 flex-wrap">
          <div className="flex items-center gap-3">
            <p className="text-xs font-mono text-dim">Smoothing Window: {window} periods</p>
            <input type="range" min={2} max={12} step={1} value={window}
              onChange={(e) => setWindow(Number(e.target.value))} className="w-28" />
          </div>
          <Button size="sm" onClick={() => onRun(selected, window)} disabled={loading || selected.length === 0}>
            {loading ? <><Spinner size={12} /><span>Running…</span></> : 'Run KPI Analysis'}
          </Button>
        </div>
        <p className="text-[10px] font-mono text-white/20">
          The smoothing window controls how many periods the moving average spans — higher = smoother line, slower to react.
        </p>
      </div>

      {error && <p className="text-xs font-mono text-dim border border-border p-3">{error}</p>}

      {kpiResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(kpiResult).slice(0, 4).map(([col, res]) => (
              <div key={col} className="glass p-4">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest truncate mb-1">{col}</p>
                <p className="text-xl font-semibold text-white">{fmt(res.mean)}</p>
                <p className="text-[10px] font-mono text-white/30 mt-1">avg · total {fmt(res.total)}</p>
              </div>
            ))}
          </div>

          {/* Per-column deep dive */}
          {Object.entries(kpiResult).map(([col, res]) => {
            const mean = res.mean ?? 0
            const chartData = res.values.map((v, i) => ({
              index: i + 1,
              value: v,
              ma:    res.moving_avg[i],
              trend: res.trend_line[i],
            }))
            const anomalyIndices = data.anomalies[col]?.indices ?? []
            const latestGrowth  = res.growth_pct.filter((v) => v !== null).slice(-1)[0] ?? null
            const kpiNote       = buildKPINote(col, res, window, anomalyIndices)
            const growthNote    = buildGrowthNote(res)

            return (
              <div key={col} className="bg-surface border border-border space-y-0 overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-border flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-white/70 font-medium">{col}</p>
                      {anomalyIndices.length > 0 && (
                        <span className="text-[10px] font-mono text-white/30 border border-white/10 px-1.5 py-0.5">
                          {anomalyIndices.length} anomal{anomalyIndices.length === 1 ? 'y' : 'ies'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-white/30 mt-0.5">
                      {res.values.length} data points · {window}-period moving average
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px] font-mono">
                    <div className="text-center">
                      <p className="text-white/25 text-[9px] uppercase tracking-widest">Min</p>
                      <p className="text-white/60">{fmt(res.min)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/25 text-[9px] uppercase tracking-widest">Avg</p>
                      <p className="text-white/80">{fmt(res.mean)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/25 text-[9px] uppercase tracking-widest">Max</p>
                      <p className="text-white/60">{fmt(res.max)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/25 text-[9px] uppercase tracking-widest">Total</p>
                      <p className="text-white/60">{fmt(res.total)}</p>
                    </div>
                    {latestGrowth !== null && (
                      <div className="text-center">
                        <p className="text-white/25 text-[9px] uppercase tracking-widest">Latest</p>
                        <p className={latestGrowth > 0 ? 'text-white/80' : 'text-white/40'}>{fmtGrowth(latestGrowth)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main chart */}
                <div className="p-4">
                  <div className="flex items-center gap-4 text-[9px] font-mono text-white/20 mb-3">
                    <span className="flex items-center gap-1"><span className="w-4 h-px bg-white/40 inline-block" />Raw values</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-px bg-white/90 inline-block" />Moving avg (MA{window})</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-px border-t border-dashed border-white/40 inline-block" />Trend line</span>
                    {anomalyIndices.length > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/80 inline-block" />Anomaly</span>}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <XAxis dataKey="index" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} label={{ value: 'Period', position: 'insideBottom', offset: -2, fontSize: 9, fill: '#3f3f46' }} />
                      <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} width={56} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => fmt(v)} />
                      <ReferenceLine y={mean} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" label={{ value: `avg ${fmt(mean)}`, fill: '#3f3f46', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                      <Line type="monotone" dataKey="value" name="Value"
                        stroke="rgba(250,250,250,0.35)" strokeWidth={1}
                        dot={(props) => <AnomalyDot {...props} anomalyIndices={anomalyIndices} />}
                        activeDot={{ r: 4 }}
                      />
                      <Line type="monotone" dataKey="ma"    name={`MA(${window})`} stroke="rgba(250,250,250,0.9)"  dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="trend" name="Trend"            stroke="rgba(120,120,120,0.5)"  dot={false} strokeWidth={1} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Personalized insight for this column */}
                  <div className="mt-3 bg-black/30 border border-white/[0.05] p-3">
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-1.5">What This Shows</p>
                    <p className="text-[11px] font-mono text-white/50 leading-relaxed">{kpiNote}</p>
                  </div>
                </div>

                {/* Growth mini chart */}
                {res.growth_pct.some((v) => v !== null) && (
                  <div className="border-t border-border p-4">
                    <p className="text-[10px] font-mono text-white/30 mb-2">Period-over-Period Growth %</p>
                    <ResponsiveContainer width="100%" height={70}>
                      <LineChart data={chartData.slice(1).map((d, i) => ({ ...d, growth: res.growth_pct[i] }))}>
                        <XAxis dataKey="index" tick={{ fontSize: 9, fill: '#3f3f46' }} />
                        <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 9, fill: '#3f3f46' }} width={36} />
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => `${v.toFixed(1)}%`} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                        <Line type="monotone" dataKey="growth" name="Growth %" stroke="rgba(250,250,250,0.6)" dot={false} strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                    {growthNote && <p className="text-[10px] font-mono text-white/25 mt-2">{growthNote}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
