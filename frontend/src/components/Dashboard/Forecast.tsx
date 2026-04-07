import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { Button }       from '../UI/Button'
import { Spinner }      from '../UI/Spinner'
import { InsightPanel } from '../UI/InsightPanel'
import { fmt, fmtAxis } from '../../utils/format'
import type { UploadResponse, ForecastResponse } from '../../types'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle:   { color: '#a1a1aa' },
  itemStyle:    { color: '#fafafa' },
}

interface Props {
  data:           UploadResponse
  forecastResult: ForecastResponse | null
  loading:        boolean
  error:          string | null
  onRun:          (targetCol: string, periods: number) => void
}

export function Forecast({ data, forecastResult, loading, error, onRun }: Props) {
  const recCols    = data.recommendations?.forecast ?? data.numeric_cols
  const defaultCol = recCols[0] ?? data.numeric_cols[0] ?? ''

  const [targetCol, setTargetCol] = useState(defaultCol)
  const [periods,   setPeriods]   = useState(12)

  const s = 'w-full bg-surface border border-border text-muted text-xs font-mono px-3 py-2 focus:outline-none focus:border-dim'

  const histLen = forecastResult?.historical.length ?? 0

  const chartData = forecastResult
    ? [
        ...forecastResult.historical.map((p) => ({
          index:  p.index,
          value:  p.value,
          fitted: p.fitted,
          upper:  undefined as number | undefined,
          lower:  undefined as number | undefined,
          band:   undefined as [number, number] | undefined,
        })),
        ...forecastResult.forecasted.map((p) => ({
          index:  p.index,
          value:  undefined as number | undefined,
          fitted: p.value,
          upper:  p.upper ?? undefined,
          lower:  p.lower ?? undefined,
          band:   (p.lower !== null && p.upper !== null) ? [p.lower, p.upper] as [number, number] : undefined,
        })),
      ]
    : []

  const lastForecast = forecastResult?.forecasted.slice(-1)[0]?.value ?? null
  const lastHistorical = forecastResult?.historical.slice(-1)[0]?.value ?? null
  const change = lastForecast !== null && lastHistorical !== null && lastHistorical !== 0
    ? ((lastForecast - lastHistorical) / Math.abs(lastHistorical)) * 100
    : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <InsightPanel insights={data.insights?.forecast ?? []} />

      {/* Controls */}
      <div className="glass p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Target Column</p>
          <select value={targetCol} onChange={(e) => setTargetCol(e.target.value)} className={s}>
            {recCols.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Forecast Periods: {periods}</p>
          <input type="range" min={3} max={36} step={1}
            value={periods} onChange={(e) => setPeriods(Number(e.target.value))} className="w-full mt-2" />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={() => onRun(targetCol, periods)} disabled={loading || !targetCol}>
            {loading ? <><Spinner size={14} /><span>Forecasting…</span></> : 'Run Forecast'}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs font-mono text-dim border border-border p-3">{error}</p>}

      {forecastResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Summary */}
          {change !== null && (
            <div className="grid grid-cols-3 gap-3">
              <div className="glass p-4">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Last Actual</p>
                <p className="text-lg font-semibold text-white">{fmt(lastHistorical)}</p>
              </div>
              <div className="glass p-4">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">End Forecast</p>
                <p className="text-lg font-semibold text-white">{fmt(lastForecast)}</p>
              </div>
              <div className="glass p-4">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Projected Change</p>
                <p className={`text-lg font-semibold ${change > 0 ? 'text-white' : 'text-white/50'}`}>
                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* Main chart */}
          <div className="bg-surface border border-border p-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-xs font-mono text-dim uppercase tracking-widest">
                {forecastResult.target_col} — {periods} Period Forecast
              </p>
              <div className="flex items-center gap-4 text-[10px] font-mono text-white/25">
                <span className="flex items-center gap-1"><span className="w-4 h-px bg-white/60 inline-block" />Historical</span>
                <span className="flex items-center gap-1"><span className="w-4 h-px border-t border-dashed border-white/40 inline-block" />Forecast</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-white/10" />95% Band</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={chartData}>
                <XAxis dataKey="index" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
                <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} width={56} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#52525b' }} />

                {/* Confidence band — filled area between lower and upper */}
                <Area type="monotone" dataKey="upper" name="Upper 95%" fill="rgba(250,250,250,0.06)"
                  stroke="rgba(250,250,250,0.15)" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                <Area type="monotone" dataKey="lower" name="Lower 95%" fill="rgba(0,0,0,0)"
                  stroke="rgba(250,250,250,0.15)" strokeWidth={1} strokeDasharray="3 3" dot={false} />

                {/* Cutoff reference line */}
                <ReferenceLine x={histLen - 1} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4"
                  label={{ value: 'Forecast →', fill: '#52525b', fontSize: 10, fontFamily: 'JetBrains Mono' }} />

                {/* Historical solid line */}
                <Line type="monotone" dataKey="value" name="Historical"
                  stroke="rgba(250,250,250,0.85)" dot={false} strokeWidth={2} connectNulls={false} />

                {/* Forecast dashed line */}
                <Line type="monotone" dataKey="fitted" name="Forecast / Fitted"
                  stroke="rgba(180,180,180,0.6)" dot={false} strokeWidth={1.5}
                  strokeDasharray="6 3" connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast table */}
          <div className="bg-surface border border-border overflow-x-auto">
            <p className="text-xs font-mono text-dim uppercase tracking-widest p-4 border-b border-border">
              Forecasted Values
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Period', 'Forecast', 'Lower (95%)', 'Upper (95%)'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-mono text-dim">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {forecastResult.forecasted.map((p, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                    <td className="px-4 py-2 font-mono text-dim">+{i + 1}</td>
                    <td className="px-4 py-2 font-mono text-muted">{p.value !== null ? fmt(p.value) : '—'}</td>
                    <td className="px-4 py-2 font-mono text-dim">{p.lower !== null ? fmt(p.lower) : '—'}</td>
                    <td className="px-4 py-2 font-mono text-dim">{p.upper !== null ? fmt(p.upper) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
