import { motion } from 'framer-motion'
import { Badge } from '../UI/Badge'
import type { UploadResponse } from '../../types'

interface Props {
  data: UploadResponse
}

export function Trends({ data }: Props) {
  const cols = data.numeric_cols

  if (!cols.length) {
    return <p className="text-sm text-dim py-8 text-center">No numeric columns to analyze.</p>
  }

  const sorted = [...cols].sort((a, b) => {
    const ta = data.trends[a]
    const tb = data.trends[b]
    return (tb?.strength ?? 0) - (ta?.strength ?? 0)
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <p className="text-xs font-mono text-dim">
        Monotonic trend analysis — measures how consistently a metric grows or declines over time.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((col, i) => {
          const trend   = data.trends[col]
          const growth  = data.growth_rates[col]
          const anomaly = data.anomalies[col]
          if (!trend) return null

          const dirLabel  = trend.direction === 'up' ? '↑ Upward' : trend.direction === 'down' ? '↓ Downward' : '→ Flat'
          const dirVariant = trend.direction === 'up' ? 'up' : trend.direction === 'down' ? 'down' : 'flat'
          const strengthPct = Math.round(trend.strength * 100)
          const monPct      = Math.round(trend.monotonic_pct * 100)

          return (
            <motion.div
              key={col}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-mono text-white/80 truncate">{col}</p>
                <Badge label={dirLabel} variant={dirVariant} />
              </div>

              {/* Strength bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-white/30">
                  <span>Trend Strength</span>
                  <span>{strengthPct}%</span>
                </div>
                <div className="h-1 bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${strengthPct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.04 + 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full bg-white/40"
                  />
                </div>
              </div>

              {/* Monotonic % bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-white/30">
                  <span>Consistency</span>
                  <span>{monPct}%</span>
                </div>
                <div className="h-1 bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${monPct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.04 + 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full bg-white/25"
                  />
                </div>
              </div>

              {/* Growth rates + anomalies */}
              <div className="flex flex-wrap gap-3 text-[11px] font-mono text-white/30 pt-1 border-t border-white/[0.06]">
                {growth?.mom !== null && growth?.mom !== undefined && (
                  <span>MoM: <span className="text-white/60">{growth.mom > 0 ? '+' : ''}{growth.mom.toFixed(1)}%</span></span>
                )}
                {growth?.yoy !== null && growth?.yoy !== undefined && (
                  <span>YoY: <span className="text-white/60">{growth.yoy > 0 ? '+' : ''}{growth.yoy.toFixed(1)}%</span></span>
                )}
                {anomaly && anomaly.count > 0 && (
                  <span>Anomalies: <span className="text-white/60">{anomaly.count} ({anomaly.pct.toFixed(1)}%)</span></span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
