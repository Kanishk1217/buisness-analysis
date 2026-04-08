import { useState } from 'react'
import { motion } from 'framer-motion'
import { MetricBox } from '../UI/MetricBox'
import { Badge } from '../UI/Badge'
import { InsightPanel } from '../UI/InsightPanel'
import { fmt } from '../../utils/format'
import type { UploadResponse } from '../../types'

interface Props { data: UploadResponse; renameMap?: Record<string, string> }

export function Overview({ data, renameMap = {} }: Props) {
  const dn = (col: string) => renameMap[col] ?? col
  const { business_context: bc } = data
  const [search, setSearch] = useState('')
  const missingPct = data.shape[0] > 0 && data.shape[1] > 0
    ? (data.missing_total / (data.shape[0] * data.shape[1])) * 100
    : 0

  const hs = data.health_score
  const hsColor = hs >= 90 ? 'bg-white/80' : hs >= 70 ? 'bg-white/50' : 'bg-white/25'

  const filteredCols = data.columns.filter((c) =>
    dn(c).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricBox label="Total Rows"     value={data.shape[0]}       sub="records"        delay={0}    />
        <MetricBox label="Columns"        value={data.shape[1]}       sub="total columns"  delay={0.05} />
        <MetricBox label="Complete Rows"  value={data.complete_rows}  sub="no missing"     delay={0.1}  />
        <MetricBox label="Duplicates"     value={data.duplicates}     sub="duplicate rows" delay={0.15} />
      </div>

      {/* Health score visual */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">Data Quality Score</p>
          <span className={`text-2xl font-semibold ${hs >= 90 ? 'text-white' : hs >= 70 ? 'text-white/70' : 'text-white/40'}`}>
            {hs}%
          </span>
        </div>
        <div className="h-1.5 bg-white/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${hs}%` }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`h-full ${hsColor}`}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-white/20">
          <span>Missing values: {fmt(missingPct, { pct: true })}</span>
          <span>Memory: {fmt(data.memory_mb, { dec: 2 })} MB</span>
          <span>{data.date_cols.length} date col(s)</span>
        </div>
      </motion.div>

      {/* Insights */}
      <InsightPanel insights={data.insights?.overview ?? []} />

      {/* Business Context */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass p-5 space-y-4"
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">Business Context Detected</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ContextGroup label="Revenue / Sales" cols={bc.revenue_cols} />
          <ContextGroup label="Cost / Expense"  cols={bc.cost_cols}    />
          <ContextGroup label="Profit / Margin" cols={bc.profit_cols}  />
          <ContextGroup label="ID Columns"      cols={bc.id_cols}      />
        </div>
        {bc.date_col && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Date Column:</span>
            <Badge label={bc.date_col} variant="up" />
          </div>
        )}
        {!bc.date_col && !bc.revenue_cols.length && !bc.cost_cols.length && !bc.profit_cols.length && (
          <p className="text-xs text-dim font-mono">No specific business columns detected.</p>
        )}
      </motion.div>

      {/* Search bar */}
      <div className="bg-surface border border-border p-3 flex items-center gap-3">
        <span className="text-dim font-mono text-xs flex-shrink-0">Search</span>
        <input
          type="text"
          placeholder="Filter columns…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search columns"
          className="w-full bg-transparent border border-border text-xs font-mono text-muted placeholder:text-dim px-3 py-1.5 focus:outline-none focus:border-white/20"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-dim text-xs font-mono hover:text-white transition-colors flex-shrink-0"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* All Columns */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-surface border border-border p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 flex-shrink-0">
            All Columns ({filteredCols.length}{search ? ` of ${data.columns.length}` : ''})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filteredCols.map((col) => {
            const isNum = data.numeric_cols.includes(col)
            const isCat = data.cat_cols.includes(col)
            const isDate = data.date_cols?.includes(col)
            const tag = isDate ? 'date' : isNum ? 'numeric' : isCat ? 'categorical' : 'other'
            const color = isDate
              ? 'border-white/20 text-white/50'
              : isNum
              ? 'border-white/15 text-white/60'
              : 'border-white/10 text-white/40'
            return (
              <div
                key={col}
                className={`flex items-center gap-1.5 border px-2 py-1 text-[11px] font-mono ${color}`}
                title={`${dn(col)} — ${tag}`}
              >
                <span>{dn(col)}</span>
                <span className="text-white/20">{isDate ? '📅' : isNum ? '#' : 'T'}</span>
              </div>
            )
          })}
          {filteredCols.length === 0 && (
            <p className="text-xs font-mono text-dim">No columns match "{search}"</p>
          )}
        </div>
        <p className="text-[10px] font-mono text-white/20">
          # = numeric · T = text/categorical · 📅 = date
        </p>
      </motion.div>

      {/* Column Summary table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-surface border border-border overflow-x-auto"
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 p-4 border-b border-border">
          Column Summary
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Column', 'Type', 'Missing', 'Anomalies', 'Trend'].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-mono text-dim">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(search ? filteredCols : data.columns).map((col) => {
              const isNum   = data.numeric_cols.includes(col)
              const missing = data.missing[col] ?? 0
              const missPct = data.shape[0] > 0 ? ((missing / data.shape[0]) * 100).toFixed(1) : '0'
              const anomaly = isNum ? (data.anomalies[col]?.count ?? 0) : null
              const trend   = isNum ? data.trends[col] : null
              return (
                <tr key={col} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                  <td className="px-4 py-2 font-mono text-muted">{dn(col)}</td>
                  <td className="px-4 py-2">
                    <Badge label={isNum ? 'numeric' : 'categorical'} variant="default" />
                  </td>
                  <td className="px-4 py-2 font-mono text-dim">
                    {missing > 0 ? <span className="text-muted">{missing} ({missPct}%)</span> : <span className="text-dim/50">none</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-dim">
                    {anomaly !== null ? (anomaly > 0 ? <span className="text-muted">{anomaly}</span> : <span className="text-dim/50">0</span>) : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {trend ? (
                      <Badge
                        label={trend.direction === 'up' ? '↑ Up' : trend.direction === 'down' ? '↓ Down' : '→ Flat'}
                        variant={trend.direction === 'up' ? 'up' : trend.direction === 'down' ? 'down' : 'flat'}
                      />
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="text-[10px] font-mono text-white/20 p-3 border-t border-border">
          Missing counts how many rows lack a value for that column. Anomalies are statistical outliers detected via Z-score. Trend shows the overall direction over time.
        </p>
      </motion.div>
    </motion.div>
  )
}

function ContextGroup({ label, cols }: { label: string; cols: string[] }) {
  return (
    <div>
      <p className="text-[10px] font-mono text-white/25 mb-1.5 uppercase tracking-widest">{label}</p>
      {cols.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {cols.map((c) => <Badge key={c} label={c} variant="default" />)}
        </div>
      ) : (
        <span className="text-[11px] text-dim font-mono">none detected</span>
      )}
    </div>
  )
}
