import { motion } from 'framer-motion'
import { fmt, fmtGrowth } from '../../utils/format'
import type { UploadResponse, CorrelationResponse } from '../../types'

interface Props {
  data:         UploadResponse
  corrResult:   CorrelationResponse | null
}

interface Section { title: string; bullets: string[] }

function buildStory(data: UploadResponse, corr: CorrelationResponse | null): Section[] {
  const { shape, health_score, duplicates, missing_total, numeric_cols, cat_cols,
          business_context: bc, trends, anomalies, growth_rates, statistics } = data
  const sections: Section[] = []

  // ── 1. Dataset Overview ──
  const comp = (100 - (missing_total / Math.max(shape[0] * shape[1], 1)) * 100).toFixed(1)
  const overview: string[] = [
    `You are working with ${shape[0].toLocaleString()} records across ${shape[1]} columns (${numeric_cols.length} numeric, ${cat_cols.length} categorical).`,
    `Data completeness is ${comp}% with a quality score of ${health_score}%.`,
  ]
  if (duplicates > 0) overview.push(`${duplicates.toLocaleString()} duplicate rows exist (${((duplicates / shape[0]) * 100).toFixed(1)}%) — removing them will improve accuracy.`)
  if (health_score >= 85) overview.push('Overall data quality is strong and suitable for reliable analysis.')
  else if (health_score < 60) overview.push('Data quality is below acceptable levels. Clean missing values and duplicates before drawing business conclusions.')
  sections.push({ title: 'Dataset Overview', bullets: overview })

  // ── 2. Business Signals ──
  const signals: string[] = []
  if (bc.revenue_cols.length) {
    const rc = bc.revenue_cols[0]
    const t  = trends[rc]
    const g  = growth_rates[rc]
    if (t) signals.push(`Revenue (${rc}) is ${t.direction === 'up' ? '↑ growing' : t.direction === 'down' ? '↓ declining' : '→ stable'} with ${Math.round(t.strength * 100)}% trend strength.${g?.mom !== null && g?.mom !== undefined ? ` Latest period change: ${fmtGrowth(g.mom)}.` : ''}`)
  }
  if (bc.profit_cols.length) {
    const pc = bc.profit_cols[0]
    const t  = trends[pc]
    if (t) signals.push(`Profit (${pc}) trend is ${t.direction === 'up' ? 'positive ↑' : t.direction === 'down' ? 'negative ↓ — margins may be shrinking' : 'flat'}.`)
  }
  if (bc.cost_cols.length) {
    const cc = bc.cost_cols[0]
    const t  = trends[cc]
    if (t?.direction === 'up') signals.push(`Costs (${cc}) are rising ↑ — compare against revenue growth to check if margins are holding.`)
  }
  const strongUp   = numeric_cols.filter((c) => trends[c]?.direction === 'up'   && trends[c]?.strength > 0.6)
  const strongDown = numeric_cols.filter((c) => trends[c]?.direction === 'down' && trends[c]?.strength > 0.6)
  if (strongUp.length)   signals.push(`${strongUp.length} metric(s) with strong upward momentum: ${strongUp.slice(0, 3).join(', ')}.`)
  if (strongDown.length) signals.push(`${strongDown.length} metric(s) declining consistently: ${strongDown.slice(0, 3).join(', ')}.`)
  if (signals.length) sections.push({ title: 'Business Signals', bullets: signals })

  // ── 3. Key Findings ──
  const findings: string[] = []

  // Top correlated pair
  if (corr?.pairs.length) {
    const top = corr.pairs[0]
    const v   = top.correlation ?? 0
    if (Math.abs(v) > 0.6)
      findings.push(`Strong ${v > 0 ? 'positive' : 'negative'} relationship between ${top.feature1} and ${top.feature2} (${v > 0 ? '+' : ''}${v.toFixed(2)}) — they ${v > 0 ? 'move together' : 'move in opposite directions'}.`)
  }

  // Anomaly findings
  const anomCols = numeric_cols.filter((c) => (anomalies[c]?.pct ?? 0) > 5).slice(0, 2)
  for (const c of anomCols)
    findings.push(`${c} contains ${anomalies[c].count} outlier(s) (${anomalies[c].pct.toFixed(1)}%) — these unusual values may represent errors or exceptional events.`)

  // Stat findings: highest mean column
  if (numeric_cols.length) {
    const topMean = numeric_cols.reduce((a, b) =>
      (statistics[a]?.mean ?? 0) > (statistics[b]?.mean ?? 0) ? a : b)
    const mean = statistics[topMean]?.mean
    if (mean) findings.push(`${topMean} has the highest average value at ${fmt(mean)}.`)
  }

  if (findings.length) sections.push({ title: 'Key Findings', bullets: findings })

  // ── 4. Risk Areas ──
  const risks: string[] = []
  if (health_score < 70) risks.push(`Data quality (${health_score}%) is below the 70% threshold — analysis results carry higher uncertainty.`)
  const heavyMissing = Object.entries(data.missing).filter(([, v]) => v / shape[0] > 0.15)
  if (heavyMissing.length) risks.push(`${heavyMissing.length} column(s) are missing >15% of values: ${heavyMissing.slice(0, 2).map(([c]) => c).join(', ')}.`)
  if (bc.revenue_cols.length && trends[bc.revenue_cols[0]]?.direction === 'down')
    risks.push('Revenue is declining — without intervention this trend will continue into the forecast period.')
  if (strongDown.length > strongUp.length)
    risks.push('More metrics are declining than growing — overall business trajectory appears negative.')
  if (risks.length) sections.push({ title: 'Risk Areas', bullets: risks })

  // ── 5. Recommended Actions ──
  const actions: string[] = []
  if (bc.revenue_cols.length && bc.cost_cols.length)
    actions.push(`Run KPI Analysis on ${bc.revenue_cols[0]} and ${bc.cost_cols[0]} together to track margin trends.`)
  if (bc.revenue_cols.length)
    actions.push(`Use Forecast tab to project ${bc.revenue_cols[0]} for the next 12 periods and identify risk windows.`)
  if (numeric_cols.length >= 2)
    actions.push('Check the Correlations tab to discover which metrics drive your key outcomes.')
  if (numeric_cols.length >= 2)
    actions.push('Run Segments to identify natural customer or product groupings in your data.')
  if (heavyMissing.length)
    actions.push(`Address missing values in ${heavyMissing.slice(0,2).map(([c]) => c).join(', ')} before running ML models.`)
  if (strongDown.length)
    actions.push(`Investigate the decline in ${strongDown.slice(0,2).join(', ')} — check if it correlates with a cost increase or external event.`)
  sections.push({ title: 'Recommended Actions', bullets: actions })

  return sections
}

export function Story({ data, corrResult }: Props) {
  const sections = buildStory(data, corrResult)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="glass p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-1">What Your Data Is Telling You</p>
        <p className="text-xs font-mono text-white/40 leading-relaxed">
          A synthesized narrative across all tabs — generated automatically from your dataset.
        </p>
      </div>

      {sections.map((section, si) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: si * 0.07 }}
          className="bg-surface border border-border p-5 space-y-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-white/20">{String(si + 1).padStart(2, '0')}</span>
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-white/50">{section.title}</p>
          </div>
          <ul className="space-y-2.5">
            {section.bullets.map((b, bi) => (
              <motion.li
                key={bi}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: si * 0.07 + bi * 0.04 }}
                className="flex items-start gap-2.5 text-sm font-mono text-white/65 leading-relaxed"
              >
                <span className="text-white/20 mt-1 flex-shrink-0">›</span>
                <span>{b}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      ))}
    </motion.div>
  )
}
