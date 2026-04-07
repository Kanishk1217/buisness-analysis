import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Button }  from '../UI/Button'
import { Spinner } from '../UI/Spinner'
import type { UploadResponse, SegmentResponse } from '../../types'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle:   { color: '#a1a1aa' },
  itemStyle:    { color: '#fafafa' },
}

// Grayscale shades for different clusters
const CLUSTER_OPACITIES = [0.9, 0.55, 0.35, 0.75, 0.45, 0.65]

interface Props {
  data:          UploadResponse
  segmentResult: SegmentResponse | null
  loading:       boolean
  error:         string | null
  onRun:         (columns: string[], nClusters: number) => void
}

export function Segments({ data, segmentResult, loading, error, onRun }: Props) {
  const defaultCols = data.numeric_cols.slice(0, 3)
  const [selected,   setSelected]   = useState<string[]>(defaultCols)
  const [nClusters,  setNClusters]  = useState(0)
  const [xAxis,      setXAxis]      = useState(defaultCols[0] ?? '')
  const [yAxis,      setYAxis]      = useState(defaultCols[1] ?? defaultCols[0] ?? '')

  const s = 'bg-surface border border-border text-muted text-xs font-mono px-3 py-2 focus:outline-none focus:border-dim'

  const toggle = (col: string) => {
    setSelected((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Controls */}
      <div className="glass p-4 space-y-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">Select Columns for Clustering</p>
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

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <div>
            <p className="text-xs font-mono text-dim mb-1">Clusters (0 = auto)</p>
            <input
              type="number" min={0} max={6} value={nClusters}
              onChange={(e) => setNClusters(Number(e.target.value))}
              className={`w-20 ${s}`}
            />
          </div>
          <Button
            size="sm"
            onClick={() => onRun(selected, nClusters)}
            disabled={loading || selected.length < 2}
          >
            {loading ? <><Spinner size={12} /><span>Segmenting…</span></> : 'Run Segmentation'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-xs font-mono text-dim border border-border p-3">{error}</p>
      )}

      {segmentResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Cluster profiles table */}
          <div className="bg-surface border border-border overflow-x-auto">
            <p className="text-xs font-mono text-dim uppercase tracking-widest p-4 border-b border-border">
              Cluster Profiles — {segmentResult.n_clusters} segments detected
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left font-mono text-dim">Cluster</th>
                  <th className="px-4 py-2 text-left font-mono text-dim">Count</th>
                  <th className="px-4 py-2 text-left font-mono text-dim">% Share</th>
                  {segmentResult.columns_used.map((c) => (
                    <th key={c} className="px-4 py-2 text-left font-mono text-dim">{c} (mean)</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(segmentResult.profiles).map(([name, profile], i) => (
                  <tr key={name} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                    <td className="px-4 py-2 font-mono text-primary" style={{ opacity: CLUSTER_OPACITIES[i] }}>
                      {name}
                    </td>
                    <td className="px-4 py-2 font-mono text-muted">{profile.count}</td>
                    <td className="px-4 py-2 font-mono text-muted">{profile.pct?.toFixed(1)}%</td>
                    {segmentResult.columns_used.map((c) => (
                      <td key={c} className="px-4 py-2 font-mono text-muted">
                        {profile[c] !== null && profile[c] !== undefined
                          ? (profile[c] as number).toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Scatter visualization */}
          {segmentResult.columns_used.length >= 2 && (
            <div className="bg-surface border border-border p-4">
              <div className="flex items-center gap-4 mb-4">
                <p className="text-xs font-mono text-dim uppercase tracking-widest">Cluster Scatter Plot</p>
                <div className="flex gap-3 ml-auto">
                  <div>
                    <span className="text-[10px] font-mono text-dim mr-1">X:</span>
                    <select value={xAxis} onChange={(e) => setXAxis(e.target.value)} className={`${s} py-1`}>
                      {segmentResult.columns_used.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-dim mr-1">Y:</span>
                    <select value={yAxis} onChange={(e) => setYAxis(e.target.value)} className={`${s} py-1`}>
                      {segmentResult.columns_used.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart>
                  <XAxis dataKey={xAxis} name={xAxis} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
                  <YAxis dataKey={yAxis} name={yAxis} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
                  <Tooltip {...TOOLTIP_STYLE} cursor={{ strokeDasharray: '3 3' }} />
                  {Array.from({ length: segmentResult.n_clusters }).map((_, k) => {
                    const clusterPoints = segmentResult.sample_data
                      .filter((row) => row['_cluster'] === k)
                      .map((row) => ({ [xAxis]: row[xAxis], [yAxis]: row[yAxis] }))
                    return (
                      <Scatter
                        key={k}
                        name={`Cluster ${k}`}
                        data={clusterPoints as Record<string, unknown>[]}
                        fill={`rgba(250,250,250,${CLUSTER_OPACITIES[k]})`}
                        fillOpacity={0.7}
                      />
                    )
                  })}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
