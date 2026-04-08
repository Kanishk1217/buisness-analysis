import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { InsightPanel } from '../UI/InsightPanel'
import { fmt, fmtAxis } from '../../utils/format'
import type { UploadResponse } from '../../types'

const TOOLTIP = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle:   { color: '#a1a1aa' },
  itemStyle:    { color: '#fafafa' },
}

type Mode = 'numeric' | 'categorical'

export function Distributions({ data }: { data: UploadResponse }) {
  const [mode, setMode] = useState<Mode>('numeric')

  const numCols = data.recommendations?.distributions_num ?? data.numeric_cols.slice(0, 8)
  const catCols = data.recommendations?.distributions_cat ?? data.cat_cols.slice(0, 5)

  const [selNum, setSelNum] = useState<string[]>(numCols.slice(0, 3))
  const [selCat, setSelCat] = useState<string[]>(catCols.slice(0, 2))

  const buildHistogram = (col: string) => {
    const vals = data.sample.map((r) => Number(r[col])).filter((v) => !isNaN(v))
    if (!vals.length) return []
    const mn = Math.min(...vals), mx = Math.max(...vals)
    const bins = Math.min(12, Math.ceil(Math.sqrt(vals.length)))
    const size = (mx - mn) / bins || 1
    const counts = Array(bins).fill(0)
    vals.forEach((v) => { counts[Math.min(Math.floor((v - mn) / size), bins - 1)]++ })
    return counts.map((count, i) => ({ range: fmt(mn + i * size), count }))
  }

  const buildCatChart = (col: string) => {
    const raw = data.cat_summary[col] ?? {}
    const entries = Object.entries(raw).slice(0, 10)
    const rest = Object.values(raw).slice(10).reduce((a, b) => a + b, 0)
    const result = entries.map(([label, count]) => ({ label, count }))
    if (rest > 0) result.push({ label: 'Others', count: rest })
    return result
  }

  const toggleNum = (col: string) =>
    setSelNum((p) => p.includes(col) ? p.filter((c) => c !== col) : [...p, col])
  const toggleCat = (col: string) =>
    setSelCat((p) => p.includes(col) ? p.filter((c) => c !== col) : [...p, col])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <InsightPanel insights={data.insights?.distributions ?? []} />

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(['numeric', 'categorical'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 text-xs font-mono border transition-colors
              ${mode === m ? 'border-primary text-primary' : 'border-border text-dim hover:border-dim'}`}
          >
            {m === 'numeric' ? `Numeric (${numCols.length})` : `Categorical (${catCols.length})`}
          </button>
        ))}
      </div>

      {mode === 'numeric' && (
        <>
          <div className="flex flex-wrap gap-2">
            {numCols.map((col) => (
              <button key={col} onClick={() => toggleNum(col)}
                className={`px-3 py-1 text-xs font-mono border transition-colors
                  ${selNum.includes(col) ? 'border-primary text-primary' : 'border-border text-dim hover:border-dim'}`}>
                {col}
              </button>
            ))}
          </div>
          {selNum.map((col) => {
            const hist = buildHistogram(col)
            const stat = data.statistics[col]
            return (
              <div key={col} className="bg-surface border border-border p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-xs font-mono text-dim uppercase tracking-widest">{col}</p>
                  {stat && (
                    <div className="flex gap-4 text-[11px] font-mono text-white/30">
                      <span>Mean: <span className="text-white/60">{fmt(stat.mean)}</span></span>
                      <span>Median: <span className="text-white/60">{fmt(stat['50%'])}</span></span>
                      <span>Std: <span className="text-white/60">{fmt(stat.std)}</span></span>
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={hist} barCategoryGap="6%">
                    <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
                    <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} width={40} />
                    <Tooltip {...TOOLTIP} formatter={(v: number) => [v, 'Count']} />
                    <Bar dataKey="count" radius={0}>
                      {hist.map((_, i) => (
                        <Cell key={i} fill={`rgba(250,250,250,${0.35 + (i / hist.length) * 0.4})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] font-mono text-white/25 mt-2">
                  Each bar shows how many rows fall in that value range. A tall bar in the centre = most values are similar. Bars far to one side = the data is skewed and may have outliers.
                </p>
              </div>
            )
          })}
        </>
      )}

      {mode === 'categorical' && (
        <>
          {catCols.length === 0 && (
            <p className="text-sm text-dim py-8 text-center">No categorical columns found.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {catCols.map((col) => (
              <button key={col} onClick={() => toggleCat(col)}
                className={`px-3 py-1 text-xs font-mono border transition-colors
                  ${selCat.includes(col) ? 'border-primary text-primary' : 'border-border text-dim hover:border-dim'}`}>
                {col}
              </button>
            ))}
          </div>
          {selCat.map((col) => {
            const catData = buildCatChart(col)
            const total = catData.reduce((s, d) => s + d.count, 0)
            return (
              <div key={col} className="bg-surface border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-dim uppercase tracking-widest">{col}</p>
                  <span className="text-[11px] font-mono text-white/30">{catData.length} categories</span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(140, catData.length * 28)}>
                  <BarChart data={catData} layout="vertical" barCategoryGap="10%">
                    <XAxis type="number" tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
                    <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'JetBrains Mono' }} />
                    <Tooltip {...TOOLTIP} formatter={(v: number) => [`${v} (${((v/total)*100).toFixed(1)}%)`, 'Count']} />
                    <Bar dataKey="count" radius={0}>
                      {catData.map((_, i) => (
                        <Cell key={i} fill={`rgba(250,250,250,${0.7 - (i / catData.length) * 0.45})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] font-mono text-white/25 mt-2">
                  Bar length shows how often each category appears. A dominant bar means one category makes up most of your data — this can skew ML models if not balanced.
                </p>
              </div>
            )
          })}
        </>
      )}
    </motion.div>
  )
}
