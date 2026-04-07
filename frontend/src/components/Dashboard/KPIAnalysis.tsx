import { useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { Button }       from '../UI/Button'
import { Spinner }      from '../UI/Spinner'
import { InsightPanel } from '../UI/InsightPanel'
import { fmt, fmtAxis, fmtGrowth } from '../../utils/format'
import type { UploadResponse, KpiResponse } from '../../types'

// Custom dot that highlights anomaly points
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

      {/* Column selector — only recommended cols shown */}
      <div className="glass p-4 space-y-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">Select KPI Columns</p>
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
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-3">
            <p className="text-xs font-mono text-dim">Moving Avg Window: {window}</p>
            <input type="range" min={2} max={12} step={1} value={window}
              onChange={(e) => setWindow(Number(e.target.value))} className="w-28" />
          </div>
          <Button size="sm" onClick={() => onRun(selected, window)} disabled={loading || selected.length === 0}>
            {loading ? <><Spinner size={12} /><span>Running…</span></> : 'Run KPI Analysis'}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs font-mono text-dim border border-border p-3">{error}</p>}

      {kpiResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Summary metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(kpiResult).slice(0, 4).map(([col, res]) => (
              <div key={col} className="glass p-4">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest truncate mb-1">{col}</p>
                <p className="text-xl font-semibold text-white">{fmt(res.mean)}</p>
                <p className="text-[10px] font-mono text-white/30 mt-1">avg · total {fmt(res.total)}</p>
              </div>
            ))}
          </div>

          {/* Per-column chart */}
          {Object.entries(kpiResult).map(([col, res]) => {
            const mean = res.mean ?? 0
            const chartData = res.values.map((v, i) => ({
              index: i,
              value: v,
              ma:    res.moving_avg[i],
              trend: res.trend_line[i],
            }))
            const latestGrowth = res.growth_pct.filter((v) => v !== null).slice(-1)[0] ?? null

            const anomalyIndices = data.anomalies[col]?.indices ?? []

            return (
              <div key={col} className="bg-surface border border-border p-4 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono text-dim uppercase tracking-widest">{col}</p>
                    {anomalyIndices.length > 0 && (
                      <span className="text-[10px] font-mono text-white/30 border border-white/10 px-1.5 py-0.5">
                        {anomalyIndices.length} anomalies
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-[11px] font-mono text-white/30">
                    <span>Min: <span className="text-white/60">{fmt(res.min)}</span></span>
                    <span>Max: <span className="text-white/60">{fmt(res.max)}</span></span>
                    <span>Total: <span className="text-white/60">{fmt(res.total)}</span></span>
                    {latestGrowth !== null && (
                      <span>Latest: <span className={latestGrowth > 0 ? 'text-white/80' : 'text-white/40'}>{fmtGrowth(latestGrowth)}</span></span>
                    )}
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="index" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
                    <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} width={56} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => fmt(v)} />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#52525b' }} />
                    <ReferenceLine y={mean} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="value" name="Value"
                      stroke="rgba(250,250,250,0.45)" strokeWidth={1.5}
                      dot={(props) => <AnomalyDot {...props} anomalyIndices={anomalyIndices} />}
                      activeDot={{ r: 4 }}
                    />
                    <Line type="monotone" dataKey="ma"    name={`MA(${window})`} stroke="rgba(250,250,250,0.9)"  dot={false} strokeWidth={2}   />
                    <Line type="monotone" dataKey="trend" name="Trend"           stroke="rgba(120,120,120,0.5)"  dot={false} strokeWidth={1} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>

                {/* Growth % mini chart */}
                {res.growth_pct.some((v) => v !== null) && (
                  <div>
                    <p className="text-[10px] font-mono text-white/25 mb-2">Period-over-Period Growth %</p>
                    <ResponsiveContainer width="100%" height={70}>
                      <LineChart data={chartData.slice(1).map((d, i) => ({ ...d, growth: res.growth_pct[i] }))}>
                        <XAxis dataKey="index" tick={{ fontSize: 9, fill: '#3f3f46' }} />
                        <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 9, fill: '#3f3f46' }} width={36} />
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => `${v.toFixed(1)}%`} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                        <Line type="monotone" dataKey="growth" name="Growth %" stroke="rgba(250,250,250,0.6)" dot={false} strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
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
