import { motion } from 'framer-motion'
import { Sparklines, SparklinesLine } from 'react-sparklines'
import { Badge } from '../UI/Badge'
import { InsightPanel } from '../UI/InsightPanel'
import { fmt, fmtGrowth } from '../../utils/format'
import type { UploadResponse } from '../../types'

interface Props { data: UploadResponse }

function buildCardNote(
  col: string,
  trend: { direction: string; strength: number; monotonic_pct: number },
  growth: { mom?: number | null; yoy?: number | null } | undefined,
  anomaly: { count: number; pct: number } | undefined,
  stats: Record<string, number | null> | undefined,
): string {
  const dir      = trend.direction
  const str      = Math.round(trend.strength * 100)
  const mono     = Math.round(trend.monotonic_pct * 100)
  const mean     = stats?.mean ?? null
  const minVal   = stats?.min  ?? null
  const maxVal   = stats?.max  ?? null

  const parts: string[] = []

  // Direction + strength
  if (dir === 'up') {
    if (str >= 75)      parts.push(`${col} is rising strongly — ${str}% trend strength with ${mono}% consistency. Values are moving upward in a sustained way.`)
    else if (str >= 45) parts.push(`${col} has a moderate upward trend (${str}% strength). There are occasional reversals (${mono}% consistent), so monitor closely.`)
    else                parts.push(`${col} leans slightly upward but without conviction (${str}% strength, ${mono}% consistent) — treat this as a noisy flat trend.`)
  } else if (dir === 'down') {
    if (str >= 75)      parts.push(`${col} is declining persistently — ${str}% trend strength. If this is a key metric, it likely needs immediate attention.`)
    else if (str >= 45) parts.push(`${col} shows a moderate downward trend (${str}% strength). Declines are real but interrupted by occasional recoveries.`)
    else                parts.push(`${col} dips slightly downward (${str}% strength) — not yet alarming, but worth watching over the next few periods.`)
  } else {
    parts.push(`${col} has no clear direction (${str}% trend strength). Values fluctuate around the mean without sustained momentum.`)
  }

  // Mean context
  if (mean !== null && minVal !== null && maxVal !== null) {
    const range = maxVal - minVal
    const rangePct = mean !== 0 ? (range / Math.abs(mean)) * 100 : 0
    if (rangePct > 50) parts.push(`Average value is ${fmt(mean)}, but the range from ${fmt(minVal)} to ${fmt(maxVal)} is wide — high volatility.`)
    else               parts.push(`Average value is ${fmt(mean)}, ranging from ${fmt(minVal)} to ${fmt(maxVal)}.`)
  }

  // Growth
  if (growth?.mom !== null && growth?.mom !== undefined) {
    const momStr = `${growth.mom > 0 ? '+' : ''}${growth.mom.toFixed(1)}%`
    if (Math.abs(growth.mom) > 10)      parts.push(`Latest month-over-month change: ${momStr} — a significant move.`)
    else if (Math.abs(growth.mom) > 3)  parts.push(`Latest month-over-month change: ${momStr}.`)
    else                                parts.push(`Latest period change: ${momStr} — relatively stable.`)
  }
  if (growth?.yoy !== null && growth?.yoy !== undefined) {
    parts.push(`Year-over-year: ${fmtGrowth(growth.yoy)}.`)
  }

  // Anomalies
  if (anomaly && anomaly.count > 0) {
    if (anomaly.pct > 10)    parts.push(`⚠ ${anomaly.count} anomalous periods detected (${anomaly.pct.toFixed(1)}% of data) — high rate of unusual values. Check for data quality issues.`)
    else if (anomaly.count > 1) parts.push(`${anomaly.count} unusual data points detected (${anomaly.pct.toFixed(1)}%) — investigate these periods for external events.`)
    else                     parts.push(`1 outlier detected — may be a one-off event or an error.`)
  }

  return parts.join(' ')
}

export function Trends({ data }: Props) {
  const cols = data.numeric_cols
  if (!cols.length) return <p className="text-sm text-dim py-8 text-center">No numeric columns to analyze.</p>

  const sorted = [...cols].sort((a, b) => (data.trends[b]?.strength ?? 0) - (data.trends[a]?.strength ?? 0))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <InsightPanel insights={data.insights?.trends ?? []} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((col, i) => {
          const trend   = data.trends[col]
          const growth  = data.growth_rates[col]
          const anomaly = data.anomalies[col]
          const stats   = data.statistics[col]
          if (!trend) return null

          const dirLabel   = trend.direction === 'up' ? '↑ Upward' : trend.direction === 'down' ? '↓ Downward' : '→ Flat'
          const dirVariant = trend.direction === 'up' ? 'up' : trend.direction === 'down' ? 'down' : 'flat'
          const strengthPct = Math.round(trend.strength * 100)
          const monPct      = Math.round(trend.monotonic_pct * 100)

          const sparkVals = data.sample
            .map((r) => Number(r[col]))
            .filter((v) => !isNaN(v))
            .slice(0, 60)

          const lineColor = trend.direction === 'up'
            ? 'rgba(250,250,250,0.8)'
            : trend.direction === 'down'
              ? 'rgba(180,180,180,0.5)'
              : 'rgba(120,120,120,0.4)'

          const note = buildCardNote(col, trend, growth, anomaly, stats as Record<string, number | null>)

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

              {sparkVals.length > 3 && (
                <div className="h-10 w-full opacity-60">
                  <Sparklines data={sparkVals} margin={2}>
                    <SparklinesLine color={lineColor} style={{ fill: 'none', strokeWidth: 1.5 }} />
                  </Sparklines>
                </div>
              )}

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

              {/* Personalized note */}
              <div className="pt-1 border-t border-white/[0.04]">
                <p className="text-[10px] font-mono text-white/30 leading-relaxed">{note}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
