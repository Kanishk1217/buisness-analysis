import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Spinner } from '../UI/Spinner'
import type { CorrelationResponse } from '../../types'

function HeatmapGrid({ data }: { data: CorrelationResponse['cleaned'] }) {
  const { columns, matrix } = data
  const getColor = (v: number | null) => {
    if (v === null) return 'transparent'
    const abs   = Math.abs(v)
    const alpha = Math.round(abs * 200)
    return v > 0
      ? `rgba(250,250,250,${alpha / 255})`
      : `rgba(120,120,120,${alpha / 255})`
  }
  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1" />
            {columns.map((c) => (
              <th key={c} className="p-1 font-mono text-dim" style={{ writingMode: 'vertical-rl', maxWidth: 24 }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td className="p-1 font-mono text-dim whitespace-nowrap pr-2">{columns[i]}</td>
              {row.map((val, j) => (
                <td
                  key={j}
                  className="w-8 h-8 text-center font-mono border border-border/30"
                  style={{ backgroundColor: getColor(val) }}
                  title={`${columns[i]} × ${columns[j]}: ${val?.toFixed(2)}`}
                >
                  <span className="text-primary/70 text-[9px]">
                    {val != null ? val.toFixed(1) : '—'}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface Props {
  correlations: CorrelationResponse | null
  loading:      boolean
  corrError:    string | null
  onLoad:       () => void
}

export function Correlations({ correlations, loading, corrError, onLoad }: Props) {
  useEffect(() => { onLoad() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3">
      <Spinner size={20} /><span className="text-sm text-muted">Computing correlations…</span>
    </div>
  )
  if (corrError) return (
    <p className="text-sm text-dim py-8 text-center">{corrError}</p>
  )
  if (!correlations) return (
    <p className="text-sm text-dim py-8 text-center">No correlation data</p>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border p-4">
          <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">Original</p>
          <HeatmapGrid data={correlations.original} />
        </div>
        <div className="bg-surface border border-border p-4">
          <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">After Cleaning</p>
          <HeatmapGrid data={correlations.cleaned} />
        </div>
      </div>
      <div className="bg-surface border border-border p-4">
        <p className="text-xs font-mono text-dim uppercase tracking-widest mb-3">Top Correlated Pairs</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Feature 1', 'Feature 2', 'Correlation'].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-mono text-dim">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {correlations.pairs.map((p, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                <td className="px-4 py-2 font-mono text-muted">{p.feature1}</td>
                <td className="px-4 py-2 font-mono text-muted">{p.feature2}</td>
                <td className="px-4 py-2 font-mono text-primary">
                  {p.correlation !== null
                    ? `${p.correlation > 0 ? '+' : ''}${p.correlation.toFixed(4)}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
