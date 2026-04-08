import { motion } from 'framer-motion'
import { Sparklines, SparklinesLine } from 'react-sparklines'
import { Badge } from '../UI/Badge'
import { InsightPanel } from '../UI/InsightPanel'
import { fmtGrowth } from '../../utils/format'
import type { UploadResponse } from '../../types'

interface Props { data: UploadResponse }

export function Trends({ data }: Props) {
  const cols = data.numeric_cols
  if (!cols.length) return <p className="text-sm text-dim py-8 text-center">No numeric columns to analyze.</p>

  const sorted = [...cols].sort((a, b) => (data.trends[b]?.strength ?? 0) - (data.trends[a]?.strength ?? 0))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <InsightPanel insights={data.insights?.trends ?? []} />

      <p className="text-[10px] font-mono text-white/25 px-1">
        Each card shows a sparkline of values over time. Trend Strength measures how consistently the column moves in one direction — 100% is a perfect trend. Consistency shows how steadily it moves without reversals.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((col, i) => {
          const trend   = data.trends[col]
          const growth  = data.growth_rates[col]
          const anomaly = data.anomalies[col]
          if (!trend) return null

          const dirLabel   = trend.direction === 'up' ? '↑ Upward' : trend.direction === 'down' ? '↓ Downward' : '→ Flat'
          const dirVariant = trend.direction === 'up' ? 'up' : trend.direction === 'down' ? 'down' : 'flat'
          const strengthPct = Math.round(trend.strength * 100)
          const monPct      = Math.round(trend.monotonic_pct * 100)

          // Build sparkline values from sample
          const sparkVals = data.sample
            .map((r) => Number(r[col]))
            .filter((v) => !isNaN(v))
            .slice(0, 60)

          const lineColor = trend.direction === 'up'
            ? 'rgba(250,250,250,0.8)'
            : trend.direction === 'down'
              ? 'rgba(180,180,180,0.5)'
              : 'rgba(120,120,120,0.4)'

          return (
            <motion.div
              key={col}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-mono text-white/80 truncate">{col}</p>
                <Badge label={dirLabel} variant={dirVariant} />
              </div>

              {/* Sparkline */}
              {sparkVals.length > 3 && (
                <div className="h-10 w-full opacity-60">
                  <Sparklines data={sparkVals} margin={2}>
                    <SparklinesLine color={lineColor} style={{ fill: 'none', strokeWidth: 1.5 }} />
                  </Sparklines>
                </div>
              )}

              {/* Strength bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-white/30">
                  <span>Trend Strength</span><span>{strengthPct}%</span>
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

              {/* Consistency bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-white/30">
                  <span>Consistency</span><span>{monPct}%</span>
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

              <div className="flex flex-wrap gap-3 text-[11px] font-mono text-white/30 pt-1 border-t border-white/[0.06]">
                {growth?.mom !== null && growth?.mom !== undefined && (
                  <span>MoM: <span className={growth.mom > 0 ? 'text-white/70' : 'text-white/40'}>{fmtGrowth(growth.mom)}</span></span>
                )}
                {growth?.yoy !== null && growth?.yoy !== undefined && (
                  <span>YoY: <span className={growth.yoy > 0 ? 'text-white/70' : 'text-white/40'}>{fmtGrowth(growth.yoy)}</span></span>
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
