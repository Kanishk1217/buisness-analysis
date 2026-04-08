import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import { Button }       from '../UI/Button'
import { Spinner }      from '../UI/Spinner'
import { InsightPanel } from '../UI/InsightPanel'
import { fmt, fmtAxis } from '../../utils/format'
import type { UploadResponse, SegmentResponse, ClusterProfile } from '../../types'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle:   { color: '#a1a1aa' },
  itemStyle:    { color: '#fafafa' },
}

const CLUSTER_OPACITIES = [0.9, 0.6, 0.38, 0.75, 0.48, 0.65]

interface SegmentComparison {
  col:       string
  segVal:    number
  globalAvg: number
  ratio:     number
  direction: 'high' | 'low' | 'mid'
}

interface SegmentProfile {
  label:       string
  description: string
  comparisons: SegmentComparison[]
}

function buildSegmentProfile(
  profile:     ClusterProfile,
  columnsUsed: string[],
  globalStats: Record<string, Record<string, number | null>>,
): SegmentProfile {
  const comparisons: SegmentComparison[] = columnsUsed.map((col) => {
    const segVal    = (profile[col] as number) ?? 0
    const globalAvg = (globalStats[col]?.mean  ?? 0) as number
    const ratio     = Math.abs(globalAvg) > 1e-9 ? segVal / Math.abs(globalAvg) : 1
    const direction = ratio > 1.25 ? 'high' : ratio < 0.75 ? 'low' : 'mid'
    return { col, segVal, globalAvg, ratio, direction }
  })

  // Build a short label from dominant characteristics
  const highs = comparisons.filter((c) => c.direction === 'high').map((c) => `High ${c.col}`)
  const lows  = comparisons.filter((c) => c.direction === 'low').map((c) => `Low ${c.col}`)
  const label = [...highs, ...lows].slice(0, 2).join(', ') || 'Average Performer'

  // Build plain-English description
  const parts: string[] = []

  const sizeWord = profile.pct > 40 ? 'largest' : profile.pct > 20 ? 'sizable' : 'smallest'
  parts.push(
    `This is the ${sizeWord} segment — ${profile.pct?.toFixed(1)}% of all records (${profile.count?.toLocaleString()} rows).`
  )

  for (const { col, segVal, globalAvg, ratio, direction } of comparisons) {
    const valStr = fmt(segVal)
    if (Math.abs(globalAvg) < 1e-9) {
      parts.push(`${col}: ${valStr}.`)
      continue
    }
    const ratioStr = ratio >= 1
      ? `${ratio.toFixed(1)}× the overall average (${fmt(globalAvg)})`
      : `${(ratio * 100).toFixed(0)}% of the overall average (${fmt(globalAvg)})`

    if (direction === 'high')
      parts.push(`${col} is notably high at ${valStr} — ${ratioStr}. This group outperforms on this metric.`)
    else if (direction === 'low')
      parts.push(`${col} is notably low at ${valStr} — ${ratioStr}. This group underperforms on this metric.`)
    else
      parts.push(`${col} sits near average at ${valStr} (${ratioStr}).`)
  }

  // Dominant characteristic summary
  if (highs.length > 0 && lows.length > 0)
    parts.push('This segment is mixed — strong in some areas, weak in others.')
  else if (highs.length >= comparisons.length && comparisons.length > 1)
    parts.push('Overall, this is a high-performing segment across all tracked metrics.')
  else if (lows.length >= comparisons.length && comparisons.length > 1)
    parts.push('Overall, this is a low-performing segment across all tracked metrics.')

  return { label, description: parts.join(' '), comparisons }
}

interface Props {
  data:          UploadResponse
  segmentResult: SegmentResponse | null
  loading:       boolean
  error:         string | null
  onRun:         (columns: string[], nClusters: number) => void
}

export function Segments({ data, segmentResult, loading, error, onRun }: Props) {
  const recCols    = data.recommendations?.segments ?? data.numeric_cols.slice(0, 3)
  const [selected,  setSelected]  = useState<string[]>(recCols.slice(0, 3))
  const [nClusters, setNClusters] = useState(0)

  const s = 'bg-surface border border-border text-muted text-xs font-mono px-3 py-2 focus:outline-none focus:border-dim'

  const toggle = (col: string) =>
    setSelected((prev) => prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <InsightPanel insights={data.insights?.segments ?? []} />

      {/* Controls */}
      <div className="glass p-4 space-y-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">Select Columns for Clustering</p>
        <div className="flex flex-wrap gap-2">
          {(data.recommendations?.segments.length ? data.recommendations.segments : data.numeric_cols).map((col) => (
            <button key={col} onClick={() => toggle(col)}
              className={`px-3 py-1 text-xs font-mono border transition-colors
                ${selected.includes(col) ? 'border-primary text-primary' : 'border-border text-dim hover:border-dim'}`}>
              {col}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <div>
            <p className="text-xs font-mono text-dim mb-1">Clusters (0 = auto)</p>
            <input type="number" min={0} max={6} value={nClusters}
              onChange={(e) => setNClusters(Number(e.target.value))}
              className={`w-20 ${s}`} />
          </div>
          <Button size="sm" onClick={() => onRun(selected, nClusters)} disabled={loading || selected.length < 2}>
            {loading ? <><Spinner size={12} /><span>Segmenting…</span></> : 'Run Segmentation'}
          </Button>
        </div>
        <p className="text-[10px] font-mono text-white/20">
          Segmentation groups similar records together using K-Means clustering. Set clusters to 0 to let the algorithm find the optimal number automatically.
        </p>
      </div>

      {error && <p className="text-xs font-mono text-dim border border-border p-3">{error}</p>}

      {segmentResult && (() => {
        // Compute profiles once for reuse throughout the render
        const profileMap: Record<string, SegmentProfile> = {}
        for (const [name, profile] of Object.entries(segmentResult.profiles)) {
          profileMap[name] = buildSegmentProfile(profile, segmentResult.columns_used, data.statistics)
        }

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Cluster summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(segmentResult.profiles).map(([name, profile], i) => {
                const sp = profileMap[name]
                return (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass p-4 space-y-1"
                  >
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{name}</p>
                    <p className="text-2xl font-semibold text-white">{profile.count?.toLocaleString()}</p>
                    <p className="text-xs font-mono text-white/30">{profile.pct?.toFixed(1)}% of records</p>
                    <p className="text-[10px] font-mono text-white/25 pt-1 border-t border-white/[0.06] leading-relaxed">
                      {sp.label}
                    </p>
                  </motion.div>
                )
              })}
            </div>

            {/* Profiles bar chart per column */}
            {segmentResult.columns_used.map((col) => {
              const globalAvg = (data.statistics[col]?.mean ?? null) as number | null
              const barData   = Object.entries(segmentResult.profiles).map(([name, profile]) => ({
                name,
                value: (profile[col] as number) ?? 0,
              }))
              const maxVal = Math.max(...barData.map((d) => d.value))
              const minVal = Math.min(...barData.map((d) => d.value))
              const spread = maxVal > 0 && minVal >= 0
                ? `highest segment (${fmt(maxVal)}) is ${(maxVal / (minVal || 1)).toFixed(1)}× the lowest (${fmt(minVal)})`
                : null

              return (
                <div key={col} className="bg-surface border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-xs font-mono text-dim uppercase tracking-widest">{col} — average per segment</p>
                    {globalAvg !== null && (
                      <p className="text-[10px] font-mono text-white/25">
                        Dataset avg: {fmt(globalAvg)}
                      </p>
                    )}
                  </div>

                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={barData} barCategoryGap="20%">
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'JetBrains Mono' }} />
                      <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} width={48} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => fmt(v)} />
                      {globalAvg !== null && (
                        <ReferenceLine
                          y={globalAvg}
                          stroke="rgba(255,255,255,0.2)"
                          strokeDasharray="4 4"
                          label={{ value: `avg ${fmt(globalAvg)}`, fill: '#52525b', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                        />
                      )}
                      <Bar dataKey="value" radius={0}>
                        {barData.map((_, i) => (
                          <Cell key={i} fill={`rgba(250,250,250,${CLUSTER_OPACITIES[i]})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* vs avg row */}
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(segmentResult.profiles).map(([name, profile]) => {
                      const segVal    = (profile[col] as number) ?? 0
                      const ratio     = globalAvg && Math.abs(globalAvg) > 1e-9 ? segVal / Math.abs(globalAvg) : null
                      const direction = ratio === null ? 'mid' : ratio > 1.25 ? 'high' : ratio < 0.75 ? 'low' : 'mid'
                      const color     = direction === 'high' ? 'text-white/70' : direction === 'low' ? 'text-white/30' : 'text-white/50'
                      return (
                        <div key={name} className="text-center">
                          <p className="text-[9px] font-mono text-white/20 uppercase">{name}</p>
                          <p className={`text-[11px] font-mono ${color}`}>
                            {ratio !== null
                              ? ratio >= 1
                                ? `${ratio.toFixed(1)}× avg`
                                : `${(ratio * 100).toFixed(0)}% of avg`
                              : fmt(segVal)
                            }
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  <p className="text-[10px] font-mono text-white/25">
                    The dashed line shows the overall dataset average.
                    {spread ? ` The ${spread}.` : ''}
                    {' '}Segments above the line outperform on this metric; below the line underperform.
                  </p>
                </div>
              )
            })}

            {/* What each segment means */}
            <div className="bg-surface border border-border overflow-hidden">
              <p className="text-xs font-mono text-dim uppercase tracking-widest p-4 border-b border-border">
                What Each Segment Means
              </p>
              <div className="divide-y divide-border/50">
                {Object.entries(segmentResult.profiles).map(([name], i) => {
                  const sp = profileMap[name]
                  return (
                    <div key={name} className="p-4 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm font-mono text-white/80">{name}</p>
                        <span
                          className="text-[10px] font-mono border border-white/10 px-2 py-0.5 text-white/40"
                          style={{ opacity: CLUSTER_OPACITIES[i] }}
                        >
                          {sp.label}
                        </span>
                      </div>

                      {/* Comparison badges */}
                      <div className="flex flex-wrap gap-2">
                        {sp.comparisons.map(({ col, ratio, direction }) => {
                          const bg    = direction === 'high' ? 'bg-white/[0.08]' : direction === 'low' ? 'bg-white/[0.03]' : 'bg-white/[0.05]'
                          const color = direction === 'high' ? 'text-white/80' : direction === 'low' ? 'text-white/30' : 'text-white/50'
                          const icon  = direction === 'high' ? '↑' : direction === 'low' ? '↓' : '→'
                          const ratioStr = ratio >= 1
                            ? `${ratio.toFixed(1)}× avg`
                            : `${(ratio * 100).toFixed(0)}% of avg`
                          return (
                            <div key={col} className={`${bg} px-2 py-1 flex items-center gap-1.5`}>
                              <span className={`text-[10px] font-mono ${color}`}>{icon} {col}</span>
                              <span className="text-[9px] font-mono text-white/20">{ratioStr}</span>
                            </div>
                          )
                        })}
                      </div>

                      <p className="text-[11px] font-mono text-white/40 leading-relaxed">{sp.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Profile table */}
            <div className="bg-surface border border-border overflow-x-auto">
              <p className="text-xs font-mono text-dim uppercase tracking-widest p-4 border-b border-border">
                Segment Profiles — {segmentResult.n_clusters} groups
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left font-mono text-dim">Segment</th>
                    <th className="px-4 py-2 text-left font-mono text-dim">Count</th>
                    <th className="px-4 py-2 text-left font-mono text-dim">Share</th>
                    {segmentResult.columns_used.map((c) => (
                      <th key={c} className="px-4 py-2 text-left font-mono text-dim">{c} avg</th>
                    ))}
                    {segmentResult.columns_used.map((c) => (
                      <th key={`vs-${c}`} className="px-4 py-2 text-left font-mono text-dim">{c} vs avg</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(segmentResult.profiles).map(([name, profile], i) => (
                    <tr key={name} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                      <td className="px-4 py-2 font-mono text-primary" style={{ opacity: CLUSTER_OPACITIES[i] }}>{name}</td>
                      <td className="px-4 py-2 font-mono text-muted">{profile.count?.toLocaleString()}</td>
                      <td className="px-4 py-2 font-mono text-muted">{profile.pct?.toFixed(1)}%</td>
                      {segmentResult.columns_used.map((c) => (
                        <td key={c} className="px-4 py-2 font-mono text-muted">
                          {profile[c] !== null && profile[c] !== undefined ? fmt(profile[c] as number) : '—'}
                        </td>
                      ))}
                      {segmentResult.columns_used.map((c) => {
                        const comp = profileMap[name]?.comparisons.find((x) => x.col === c)
                        if (!comp) return <td key={`vs-${c}`} className="px-4 py-2 font-mono text-muted">—</td>
                        const color = comp.direction === 'high' ? 'text-white/70' : comp.direction === 'low' ? 'text-white/30' : 'text-white/50'
                        const icon  = comp.direction === 'high' ? '↑ ' : comp.direction === 'low' ? '↓ ' : ''
                        const ratioStr = comp.ratio >= 1
                          ? `${comp.ratio.toFixed(1)}×`
                          : `${(comp.ratio * 100).toFixed(0)}%`
                        return (
                          <td key={`vs-${c}`} className={`px-4 py-2 font-mono ${color}`}>
                            {icon}{ratioStr}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] font-mono text-white/20 p-4">
                "vs avg" columns show each segment's value relative to the overall dataset average — 1.5× means 50% above average, 60% means 40% below average.
              </p>
            </div>
          </motion.div>
        )
      })()}
    </motion.div>
  )
}
