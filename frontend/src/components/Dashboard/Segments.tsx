import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Button }       from '../UI/Button'
import { Spinner }      from '../UI/Spinner'
import { InsightPanel } from '../UI/InsightPanel'
import { fmt, fmtAxis } from '../../utils/format'
import type { UploadResponse, SegmentResponse } from '../../types'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle:   { color: '#a1a1aa' },
  itemStyle:    { color: '#fafafa' },
}

const CLUSTER_OPACITIES = [0.9, 0.6, 0.38, 0.75, 0.48, 0.65]

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
      </div>

      {error && <p className="text-xs font-mono text-dim border border-border p-3">{error}</p>}

      {segmentResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Cluster summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(segmentResult.profiles).map(([name, profile], i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass p-4"
                style={{ opacity: CLUSTER_OPACITIES[i] }}
              >
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">{name}</p>
                <p className="text-2xl font-semibold text-white">{profile.count?.toLocaleString()}</p>
                <p className="text-xs font-mono text-white/30 mt-1">{profile.pct?.toFixed(1)}% of records</p>
              </motion.div>
            ))}
          </div>

          {/* Profiles bar chart per column */}
          {segmentResult.columns_used.map((col) => {
            const barData = Object.entries(segmentResult.profiles).map(([name, profile]) => ({
              name,
              value: profile[col] as number ?? 0,
            }))
            return (
              <div key={col} className="bg-surface border border-border p-4">
                <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">
                  {col} — average per segment
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={barData} barCategoryGap="20%">
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'JetBrains Mono' }} />
                    <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} width={48} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="value" radius={0}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={`rgba(250,250,250,${CLUSTER_OPACITIES[i]})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          })}

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
