import { motion } from 'framer-motion'
import { MetricBox } from '../UI/MetricBox'
import { Badge } from '../UI/Badge'
import type { UploadResponse } from '../../types'

interface Props {
  data: UploadResponse
}

export function Overview({ data }: Props) {
  const { business_context: bc } = data

  const missingPct = data.shape[0] > 0 && data.shape[1] > 0
    ? ((data.missing_total / (data.shape[0] * data.shape[1])) * 100).toFixed(1)
    : '0'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricBox label="Health Score"   value={`${data.health_score}%`} sub="data quality" delay={0}    />
        <MetricBox label="Total Rows"     value={data.shape[0]}           sub="records"       delay={0.05} />
        <MetricBox label="Missing Values" value={`${missingPct}%`}        sub="of all cells"  delay={0.1}  />
        <MetricBox label="Duplicates"     value={data.duplicates}         sub="duplicate rows" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricBox label="Columns"       value={data.shape[1]}          sub="total columns"   delay={0.2} />
        <MetricBox label="Numeric Cols"  value={data.numeric_cols.length} sub="numeric"        delay={0.25} />
        <MetricBox label="Complete Rows" value={data.complete_rows}     sub="no missing"      delay={0.3} />
      </div>

      {/* Business Context Detection */}
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
          <p className="text-xs text-dim font-mono">No specific business columns detected — column names don't match common business patterns.</p>
        )}
      </motion.div>

      {/* Column Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
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
            {data.columns.map((col) => {
              const isNum   = data.numeric_cols.includes(col)
              const missing = data.missing[col] ?? 0
              const missPct = data.shape[0] > 0 ? ((missing / data.shape[0]) * 100).toFixed(1) : '0'
              const anomaly = isNum ? (data.anomalies[col]?.count ?? 0) : null
              const trend   = isNum ? data.trends[col] : null
              return (
                <tr key={col} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                  <td className="px-4 py-2 font-mono text-muted">{col}</td>
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
      </motion.div>

      {/* Memory info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-4 text-[11px] font-mono text-white/25"
      >
        <span>Memory: {data.memory_mb.toFixed(2)} MB</span>
        <span>·</span>
        <span>{data.date_cols.length} date column(s) detected</span>
        <span>·</span>
        <span>{data.cat_cols.length} categorical column(s)</span>
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
