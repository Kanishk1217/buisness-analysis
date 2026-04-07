import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Button }  from '../UI/Button'
import { Spinner } from '../UI/Spinner'
import type { UploadResponse, KpiResponse } from '../../types'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle:   { color: '#a1a1aa' },
  itemStyle:    { color: '#fafafa' },
}

interface Props {
  data:       UploadResponse
  kpiResult:  KpiResponse | null
  loading:    boolean
  error:      string | null
  onRun:      (columns: string[], window: number) => void
}

export function KPIAnalysis({ data, kpiResult, loading, error, onRun }: Props) {
  const defaultCols = [
    ...data.business_context.revenue_cols,
    ...data.business_context.profit_cols,
  ].slice(0, 3)

  const [selected, setSelected] = useState<string[]>(
    defaultCols.length > 0 ? defaultCols : data.numeric_cols.slice(0, 2),
  )
  const [window, setWindow] = useState(3)

  const toggle = (col: string) => {
    setSelected((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Column selector */}
      <div className="glass p-4 space-y-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">Select Columns to Analyze</p>
        <div className="flex flex-wrap gap-2">
          {data.numeric_cols.map((col) => (
            <button
              key={col}
              onClick={() => toggle(col)}
              className={`px-3 py-1 text-xs font-mono border transition-colors
                ${selected.includes(col)
                  ? 'border-primary text-primary'
                  : 'border-border text-dim hover:border-dim'}`}
            >
              {col}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-3">
            <p className="text-xs font-mono text-dim">Moving Avg Window: {window}</p>
            <input
              type="range" min={2} max={12} step={1}
              value={window} onChange={(e) => setWindow(Number(e.target.value))}
              className="w-28"
            />
          </div>
          <Button
            size="sm"
            onClick={() => onRun(selected, window)}
            disabled={loading || selected.length === 0}
          >
            {loading ? <><Spinner size={12} /><span>Running…</span></> : 'Run KPI Analysis'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-xs font-mono text-dim border border-border p-3">{error}</p>
      )}

      {kpiResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(kpiResult).slice(0, 4).map(([col, res]) => (
              <div key={col} className="glass p-4">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest truncate mb-1">{col}</p>
                <p className="text-lg font-semibold text-white">
                  {res.mean !== null ? res.mean.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                </p>
                <p className="text-[10px] font-mono text-white/30 mt-1">mean</p>
              </div>
            ))}
          </div>

          {/* Charts per column */}
          {Object.entries(kpiResult).map(([col, res]) => {
            const chartData = res.values.map((v, i) => ({
              index:   i,
              value:   v,
              ma:      res.moving_avg[i],
              trend:   res.trend_line[i],
              growth:  i > 0 ? res.growth_pct[i - 1] : null,
            }))

            return (
              <div key={col} className="bg-surface border border-border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-dim uppercase tracking-widest">{col}</p>
                  <div className="flex gap-4 text-[11px] font-mono text-white/30">
                    <span>Min: <span className="text-white/60">{res.min?.toFixed(2) ?? '—'}</span></span>
                    <span>Max: <span className="text-white/60">{res.max?.toFixed(2) ?? '—'}</span></span>
                    <span>Total: <span className="text-white/60">{res.total !== null ? res.total.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}</span></span>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="index" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#52525b' }} />
                    <Line type="monotone" dataKey="value" name="Value"        stroke="rgba(250,250,250,0.5)"  dot={false} strokeWidth={1.5} />
                    <Line type="monotone" dataKey="ma"    name={`MA(${window})`} stroke="rgba(250,250,250,0.9)"  dot={false} strokeWidth={2}   />
                    <Line type="monotone" dataKey="trend" name="Trend"        stroke="rgba(120,120,120,0.5)"  dot={false} strokeWidth={1} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>

                {/* Growth % mini chart */}
                {res.growth_pct.some((v) => v !== null) && (
                  <div>
                    <p className="text-[10px] font-mono text-white/25 mb-2">Period-over-Period Growth %</p>
                    <ResponsiveContainer width="100%" height={80}>
                      <LineChart data={chartData.slice(1)}>
                        <XAxis dataKey="index" tick={{ fontSize: 9, fill: '#52525b' }} />
                        <YAxis tick={{ fontSize: 9, fill: '#52525b' }} />
                        <Tooltip {...TOOLTIP_STYLE} />
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
