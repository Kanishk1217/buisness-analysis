import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { InsightPanel } from '../UI/InsightPanel'
import { fmt, fmtAxis } from '../../utils/format'
import type { UploadResponse } from '../../types'

const TOOLTIP = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle:   { color: '#a1a1aa' },
  itemStyle:    { color: '#fafafa' },
}

type Mode = 'numeric' | 'categorical'

function buildHistNote(
  col:  string,
  hist: { range: string; count: number }[],
  stat: Record<string, number | null> | undefined,
): string {
  if (!hist.length || !stat) return `No data available for "${col}".`

  const mean   = stat.mean   ?? null
  const median = stat['50%'] ?? null
  const std    = stat.std    ?? null
  const min    = stat.min    ?? null
  const max    = stat.max    ?? null

  const parts: string[] = []

  // Skewness
  if (mean !== null && median !== null) {
    const denom    = Math.abs(median) + 1e-6
    const skewRatio = (mean - median) / denom
    if (Math.abs(skewRatio) > 0.25) {
      const dir = skewRatio > 0 ? 'right-skewed' : 'left-skewed'
      const tail = skewRatio > 0 ? 'high' : 'low'
      parts.push(`${col} is ${dir} — there's a long tail of unusually ${tail} values. Mean (${fmt(mean)}) is ${skewRatio > 0 ? 'above' : 'below'} median (${fmt(median)}), so the average is pulled by outliers.`)
    } else {
      parts.push(`${col} is roughly symmetric — mean (${fmt(mean)}) and median (${fmt(median)}) are close, suggesting few extreme outliers.`)
    }
  }

  // Range
  if (min !== null && max !== null) {
    parts.push(`Values span ${fmt(min)} to ${fmt(max)}.`)
  }

  // Variability
  if (std !== null && mean !== null && Math.abs(mean) > 1e-9) {
    const cv = Math.abs(std / mean)
    if (cv > 0.5)
      parts.push(`High spread (std = ${fmt(std)}, ${(cv * 100).toFixed(0)}% of mean) — values vary widely, which may affect model accuracy.`)
    else
      parts.push(`Low spread (std = ${fmt(std)}) — values cluster near the mean, good for consistent modelling.`)
  }

  // Peak bin
  const total   = hist.reduce((s, d) => s + d.count, 0)
  const peak    = hist.reduce((b, d) => d.count > b.count ? d : b, hist[0])
  const peakPct = total > 0 ? ((peak.count / total) * 100).toFixed(0) : '0'
  parts.push(`The most common range is around ${peak.range} (${peakPct}% of the sample).`)

  return parts.join(' ')
}

function buildCatNote(
  col:     string,
  catData: { label: string; count: number }[],
  total:   number,
): string {
  if (!catData.length) return `No categories found for "${col}".`

  const top    = catData[0]
  const topPct = total > 0 ? (top.count / total) * 100 : 0
  const unique = catData.length

  const parts: string[] = []
  parts.push(`"${top.label}" is the most common value in ${col} — ${top.count.toLocaleString()} rows (${topPct.toFixed(1)}% of the sample).`)

  if (topPct > 70)
    parts.push(`⚠ Severe imbalance: one category holds ${topPct.toFixed(0)}% of rows. ML models trained on this column will be biased — use oversampling or class weights.`)
  else if (topPct > 50)
    parts.push(`Mild imbalance — the top category has majority share. Consider this when evaluating classification accuracy.`)
  else
    parts.push(`Categories are relatively balanced — no single value dominates, which is good for ML classification.`)

  if (unique > 8)
    parts.push(`${unique} distinct values shown — high cardinality. Consider encoding or grouping rare categories before training.`)

  const second = catData[1]
  if (second && topPct < 70) {
    const ratio = (top.count / second.count).toFixed(1)
    parts.push(`The top value is ${ratio}× more common than the next ("${second.label}").`)
  }

  return parts.join(' ')
}

export function Distributions({ data }: { data: UploadResponse }) {
  const [mode, setMode] = useState<Mode>('numeric')

  const numCols = data.recommendations?.distributions_num ?? data.numeric_cols.slice(0, 8)
  const catCols = data.recommendations?.distributions_cat ?? data.cat_cols.slice(0, 5)

  const [selNum, setSelNum] = useState<string[]>(numCols.slice(0, 3))
  const [selCat, setSelCat] = useState<string[]>(catCols.slice(0, 2))

  const buildHistogram = (col: string) => {
    const vals = data.sample.map((r) => Number(r[col])).filter((v) => !isNaN(v))
    if (!vals.length) return []
    const mn   = Math.min(...vals), mx = Math.max(...vals)
    const bins = Math.min(12, Math.ceil(Math.sqrt(vals.length)))
    const size = (mx - mn) / bins || 1
    const counts = Array(bins).fill(0)
    vals.forEach((v) => { counts[Math.min(Math.floor((v - mn) / size), bins - 1)]++ })
    return counts.map((count, i) => ({ range: fmt(mn + i * size), count }))
  }

  const buildCatChart = (col: string) => {
    const raw     = data.cat_summary[col] ?? {}
    const entries = Object.entries(raw).sort((a, b) => b[1] - a[1]).slice(0, 10)
    const rest    = Object.values(raw).slice(10).reduce((a, b) => a + b, 0)
    const result  = entries.map(([label, count]) => ({ label, count }))
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

      {/* ── Numeric histograms ── */}
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
            const mean = stat?.mean ?? null
            const note = buildHistNote(col, hist, stat)

            return (
              <div key={col} className="bg-surface border border-border p-4 space-y-3">
                {/* Header with stats */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-xs font-mono text-dim uppercase tracking-widest">{col}</p>
                  {stat && (
                    <div className="flex flex-wrap gap-4 text-[11px] font-mono text-white/30">
                      <span>Min: <span className="text-white/60">{fmt(stat.min)}</span></span>
                      <span>Mean: <span className="text-white/60">{fmt(stat.mean)}</span></span>
                      <span>Median: <span className="text-white/60">{fmt(stat['50%'])}</span></span>
                      <span>Max: <span className="text-white/60">{fmt(stat.max)}</span></span>
                      <span>Std: <span className="text-white/60">{fmt(stat.std)}</span></span>
                    </div>
                  )}
                </div>

                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={hist} barCategoryGap="6%">
                    <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
                    <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} width={40} />
                    <Tooltip {...TOOLTIP} formatter={(v: number) => [v, 'Count']} />
                    {mean !== null && (
                      <ReferenceLine
                        x={fmt(mean)}
                        stroke="rgba(255,255,255,0.2)"
                        strokeDasharray="4 4"
                        label={{ value: 'mean', fill: '#52525b', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                      />
                    )}
                    <Bar dataKey="count" radius={0}>
                      {hist.map((_, i) => {
                        const isPeak = hist[i].count === Math.max(...hist.map(h => h.count))
                        return (
                          <Cell key={i} fill={`rgba(250,250,250,${isPeak ? 0.85 : 0.3 + (i / hist.length) * 0.35})`} />
                        )
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Personalized note */}
                <p className="text-[10px] font-mono text-white/30 leading-relaxed border-t border-white/[0.05] pt-3">
                  {note}
                </p>
              </div>
            )
          })}
        </>
      )}

      {/* ── Categorical charts ── */}
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
            const total   = catData.reduce((s, d) => s + d.count, 0)
            const note    = buildCatNote(col, catData, total)

            return (
              <div key={col} className="bg-surface border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-dim uppercase tracking-widest">{col}</p>
                  <span className="text-[11px] font-mono text-white/30">
                    {catData.length} categories · {total.toLocaleString()} rows
                  </span>
                </div>

                <ResponsiveContainer width="100%" height={Math.max(140, catData.length * 28)}>
                  <BarChart data={catData} layout="vertical" barCategoryGap="10%">
                    <XAxis type="number" tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
                    <YAxis type="category" dataKey="label" width={110}
                      tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'JetBrains Mono' }} />
                    <Tooltip {...TOOLTIP}
                      formatter={(v: number) => [`${v.toLocaleString()} (${((v / total) * 100).toFixed(1)}%)`, 'Count']} />
                    <Bar dataKey="count" radius={0}>
                      {catData.map((_, i) => (
                        <Cell key={i} fill={`rgba(250,250,250,${i === 0 ? 0.85 : 0.7 - (i / catData.length) * 0.45})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Personalized note */}
                <p className="text-[10px] font-mono text-white/30 leading-relaxed border-t border-white/[0.05] pt-3">
                  {note}
                </p>
              </div>
            )
          })}
        </>
      )}
    </motion.div>
  )
}
