import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Button }  from '../UI/Button'
import { Spinner } from '../UI/Spinner'
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
  const defaultCol =
    data.business_context.revenue_cols[0] ||
    data.business_context.profit_cols[0]  ||
    data.numeric_cols[0] || ''

  const [targetCol, setTargetCol] = useState(defaultCol)
  const [periods,   setPeriods]   = useState(12)

  const s = 'w-full bg-surface border border-border text-muted text-xs font-mono px-3 py-2 focus:outline-none focus:border-dim'

  const chartData = forecastResult
    ? [
        ...forecastResult.historical.map((p) => ({
          index:  p.index,
          value:  p.value,
          fitted: p.fitted,
          type:   'historical',
        })),
        ...forecastResult.forecasted.map((p) => ({
          index:  p.index,
          value:  p.value,
          lower:  p.lower,
          upper:  p.upper,
          band:   p.upper !== null && p.lower !== null ? [p.lower, p.upper] : null,
          type:   'forecast',
        })),
      ]
    : []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Controls */}
      <div className="glass p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Target Column</p>
          <select value={targetCol} onChange={(e) => setTargetCol(e.target.value)} className={s}>
            {data.numeric_cols.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Forecast Periods: {periods}</p>
          <input
            type="range" min={3} max={36} step={1}
            value={periods} onChange={(e) => setPeriods(Number(e.target.value))}
            className="w-full mt-2"
          />
        </div>
        <div className="flex items-end">
          <Button
            className="w-full"
            onClick={() => onRun(targetCol, periods)}
            disabled={loading || !targetCol}
          >
            {loading
              ? <><Spinner size={14} /><span>Forecasting…</span></>
              : 'Run Forecast'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-xs font-mono text-dim border border-border p-3">{error}</p>
      )}

      {forecastResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-surface border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-mono text-dim uppercase tracking-widest">
                {forecastResult.target_col} — Forecast ({periods} periods)
              </p>
              {forecastResult.std_residual !== null && (
                <span className="text-[11px] font-mono text-white/30">
                  ±{forecastResult.std_residual.toFixed(2)} std residual
                </span>
              )}
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <XAxis dataKey="index" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#52525b' }} />

                {/* Confidence band */}
                <Area
                  type="monotone"
                  dataKey="upper"
                  name="Upper Band"
                  fill="rgba(250,250,250,0.04)"
                  stroke="rgba(250,250,250,0.1)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  name="Lower Band"
                  fill="rgba(0,0,0,0)"
                  stroke="rgba(250,250,250,0.1)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                />

                {/* Historical actual */}
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Value"
                  stroke="rgba(250,250,250,0.8)"
                  dot={false}
                  strokeWidth={2}
                  connectNulls={false}
                />

                {/* Fitted / forecast line */}
                <Line
                  type="monotone"
                  dataKey="fitted"
                  name="Fitted"
                  stroke="rgba(180,180,180,0.5)"
                  dot={false}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Table of forecast values */}
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
                    <td className="px-4 py-2 font-mono text-muted">
                      {p.value !== null ? p.value.toFixed(4) : '—'}
                    </td>
                    <td className="px-4 py-2 font-mono text-dim">
                      {p.lower !== null ? p.lower.toFixed(4) : '—'}
                    </td>
                    <td className="px-4 py-2 font-mono text-dim">
                      {p.upper !== null ? p.upper.toFixed(4) : '—'}
                    </td>
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
