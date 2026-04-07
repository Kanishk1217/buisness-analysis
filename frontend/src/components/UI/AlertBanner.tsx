import { motion, AnimatePresence } from 'framer-motion'
import type { UploadResponse } from '../../types'

interface Alert {
  level: 'critical' | 'warning' | 'info'
  message: string
}

function buildAlerts(data: UploadResponse): Alert[] {
  const alerts: Alert[] = []
  const { shape, missing_total, duplicates, health_score, trends, business_context: bc, anomalies, numeric_cols } = data

  // Critical: very poor data quality
  if (health_score < 50)
    alerts.push({ level: 'critical', message: `Data quality is critically low (${health_score}%) — results may be unreliable. Clean missing values before analysis.` })

  // Critical: majority missing
  const missingPct = (missing_total / Math.max(shape[0] * shape[1], 1)) * 100
  if (missingPct > 30)
    alerts.push({ level: 'critical', message: `${missingPct.toFixed(0)}% of all data is missing. Analysis will be heavily affected.` })

  // Warning: revenue declining
  if (bc.revenue_cols.length) {
    const rev = bc.revenue_cols[0]
    if (trends[rev]?.direction === 'down')
      alerts.push({ level: 'critical', message: `⚠ Revenue (${rev}) is on a downward trend — immediate attention recommended.` })
  }

  // Warning: high duplicates
  if (duplicates > 0 && duplicates / shape[0] > 0.1)
    alerts.push({ level: 'warning', message: `${duplicates.toLocaleString()} duplicate rows (${((duplicates / shape[0]) * 100).toFixed(0)}%) detected — remove them for accurate analysis.` })

  // Warning: high anomaly columns
  const highAnom = numeric_cols.filter((c) => (anomalies[c]?.pct ?? 0) > 10)
  if (highAnom.length)
    alerts.push({ level: 'warning', message: `${highAnom.length} column(s) have >10% outliers: ${highAnom.slice(0, 2).join(', ')}. Charts may appear distorted.` })

  // Info: no business context
  if (!bc.revenue_cols.length && !bc.profit_cols.length && !bc.cost_cols.length)
    alerts.push({ level: 'info', message: 'No revenue/profit/cost columns detected. Rename columns to match common patterns for smarter analysis.' })

  return alerts.slice(0, 3)
}

const styles = {
  critical: 'border-white/20 bg-white/[0.04] text-white/80',
  warning:  'border-white/10 bg-white/[0.03] text-white/60',
  info:     'border-white/[0.06] bg-white/[0.02] text-white/40',
}
const icons = { critical: '●', warning: '◆', info: '○' }

export function AlertBanner({ data }: { data: UploadResponse }) {
  const alerts = buildAlerts(data)
  if (!alerts.length) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        {alerts.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`flex items-start gap-3 px-4 py-3 border text-xs font-mono ${styles[a.level]}`}
            role="alert"
            aria-live="polite"
          >
            <span className="flex-shrink-0 mt-0.5">{icons[a.level]}</span>
            <span>{a.message}</span>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
