import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Spinner } from '../UI/Spinner'
import { Badge }   from '../UI/Badge'
import type { CorrelationResponse, UploadResponse } from '../../types'

function strengthLabel(v: number): { text: string; variant: 'up' | 'down' | 'flat' | 'default' } {
  const abs = Math.abs(v)
  if (abs >= 0.8) return { text: v > 0 ? 'Very Strong +' : 'Very Strong −', variant: v > 0 ? 'up' : 'down' }
  if (abs >= 0.6) return { text: v > 0 ? 'Strong +'      : 'Strong −',      variant: v > 0 ? 'up' : 'down' }
  if (abs >= 0.4) return { text: v > 0 ? 'Moderate +'    : 'Moderate −',    variant: 'flat' }
  if (abs >= 0.2) return { text: 'Weak',    variant: 'default' }
  return { text: 'None', variant: 'default' }
}

function HeatmapGrid({ data }: { data: CorrelationResponse['cleaned'] }) {
  const { columns, matrix } = data
  // Cap at 10 columns for readability
  const cols = columns.slice(0, 10)
  const mat  = matrix.slice(0, 10).map((row) => row.slice(0, 10))

  const getColor = (v: number | null) => {
    if (v === null) return 'transparent'
    const abs = Math.abs(v)
    if (v > 0) return `rgba(250,250,250,${(abs * 0.75).toFixed(2)})`
    return `rgba(100,130,180,${(abs * 0.75).toFixed(2)})`
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1" />
            {cols.map((c) => (
              <th key={c} className="p-1 font-mono text-dim text-[9px]"
                style={{ writingMode: 'vertical-rl', maxWidth: 28, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mat.map((row, i) => (
            <tr key={i}>
              <td className="p-1 font-mono text-dim text-[9px] whitespace-nowrap pr-2 max-w-[80px] truncate">{cols[i]}</td>
              {row.map((val, j) => (
                <td
                  key={j}
                  className="w-8 h-8 text-center font-mono border border-border/20"
                  style={{ backgroundColor: getColor(val) }}
                  title={`${cols[i]} × ${cols[j]}: ${val?.toFixed(2) ?? '—'}`}
                >
                  <span className="text-primary/60 text-[8px] select-none">
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
  uploadData:   UploadResponse
}

export function Correlations({ correlations, loading, corrError, onLoad, uploadData }: Props) {
  useEffect(() => { onLoad() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3">
      <Spinner size={20} /><span className="text-sm text-muted">Computing correlations…</span>
    </div>
  )
  if (corrError) return <p className="text-sm text-dim py-8 text-center">{corrError}</p>
  if (!correlations) return <p className="text-sm text-dim py-8 text-center">No correlation data</p>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Insight panel */}
      {uploadData?.insights?.correlations && (
        <div className="glass p-4 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-3">Key Insights</p>
          <ul className="space-y-2">
            {uploadData.insights.correlations.map((text, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs font-mono text-white/60 leading-relaxed">
                <span className="text-white/20 mt-0.5 flex-shrink-0">›</span><span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Color legend */}
      <div className="flex items-center gap-6 text-[10px] font-mono text-white/30">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 inline-block bg-white/70" />Positive (light)</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 inline-block" style={{ background: 'rgba(100,130,180,0.7)' }} />Negative (blue)</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 inline-block bg-white/10" />Near zero</div>
        <span className="ml-auto">Capped at 10 columns</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border p-4">
          <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">Original Data</p>
          <HeatmapGrid data={correlations.original} />
          <p className="text-[10px] font-mono text-white/25 mt-3">
            Each cell shows how strongly two columns move together. Light = positive link (both rise together). Blue = negative (one rises while the other falls). Near white/transparent = no relationship.
          </p>
        </div>
        <div className="bg-surface border border-border p-4">
          <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">After Cleaning</p>
          <HeatmapGrid data={correlations.cleaned} />
          <p className="text-[10px] font-mono text-white/25 mt-3">
            Same heatmap after removing missing values and outliers. Differences from the original reveal relationships that were hidden or distorted by bad data.
          </p>
        </div>
      </div>

      {/* Top pairs with plain English strength */}
      <div className="bg-surface border border-border p-4">
        <p className="text-xs font-mono text-dim uppercase tracking-widest mb-3">Top Correlated Pairs</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Feature 1', 'Feature 2', 'Correlation', 'Strength', 'Meaning'].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-mono text-dim">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {correlations.pairs.map((p, i) => {
              const v = p.correlation ?? 0
              const { text, variant } = strengthLabel(v)
              const meaning = Math.abs(v) >= 0.6
                ? (v > 0 ? 'Rise together' : 'Move opposite')
                : Math.abs(v) >= 0.3 ? 'Slight link' : 'No link'
              return (
                <tr key={i} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                  <td className="px-4 py-2 font-mono text-muted">{p.feature1}</td>
                  <td className="px-4 py-2 font-mono text-muted">{p.feature2}</td>
                  <td className="px-4 py-2 font-mono text-primary">
                    {p.correlation !== null ? `${v > 0 ? '+' : ''}${v.toFixed(3)}` : '—'}
                  </td>
                  <td className="px-4 py-2"><Badge label={text} variant={variant} /></td>
                  <td className="px-4 py-2 font-mono text-dim text-[11px]">{meaning}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
