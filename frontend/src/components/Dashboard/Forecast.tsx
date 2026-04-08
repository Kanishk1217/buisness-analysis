import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { Button }      from '../UI/Button'
import { Spinner }     from '../UI/Spinner'
import { InsightPanel } from '../UI/InsightPanel'
import { TrustBadge }  from '../UI/TrustBadge'
import { fmt, fmtAxis } from '../../utils/format'
import type { UploadResponse, ForecastResponse } from '../../types'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle:   { color: '#a1a1aa' },
  itemStyle:    { color: '#fafafa' },
}

interface Props {
  data:           UploadResponse
  forecastResult: ForecastResponse | null
  loading:        boolean
  error:          string | null
  onRun:          (targetCol: string, periods: number) => void
}

export function Forecast({ data, forecastResult, loading, error, onRun }: Props) {
  const recCols    = data.recommendations?.forecast ?? data.numeric_cols
  const defaultCol = recCols[0] ?? data.numeric_cols[0] ?? ''

  const [targetCol, setTargetCol] = useState(defaultCol)
  const [periods,   setPeriods]   = useState(12)

  const s = 'w-full bg-surface border border-border text-muted text-xs font-mono px-3 py-2 focus:outline-none focus:border-dim'

  const histLen       = forecastResult?.historical.length ?? 0
  const lastForecast  = forecastResult?.forecasted.slice(-1)[0]?.value ?? null
  const lastHistorical = forecastResult?.historical.slice(-1)[0]?.value ?? null
  const change = lastForecast !== null && lastHistorical !== null && lastHistorical !== 0
    ? ((lastForecast - lastHistorical) / Math.abs(lastHistorical)) * 100
    : null

  // 95% band at end of forecast
  const lastPoint    = forecastResult?.forecasted.slice(-1)[0]
  const bandLow      = lastPoint?.lower ?? null
  const bandHigh     = lastPoint?.upper ?? null
  const bandWidth    = bandLow !== null && bandHigh !== null ? bandHigh - bandLow : null
  const bandWidthPct = lastForecast && bandWidth ? (bandWidth / Math.abs(lastForecast)) * 100 : null

  // Confidence score
  const stdRes = forecastResult?.std_residual ?? null
  const confidenceVal = stdRes !== null && lastHistorical !== null && lastHistorical !== 0
    ? Math.max(0, 1 - stdRes / Math.abs(lastHistorical))
    : null

  const chartData = forecastResult
    ? [
        ...forecastResult.historical.map((p) => ({
          index:  p.index,
          value:  p.value,
          fitted: p.fitted,
          upper:  undefined as number | undefined,
          lower:  undefined as number | undefined,
        })),
        ...forecastResult.forecasted.map((p) => ({
          index:  p.index,
          value:  undefined as number | undefined,
          fitted: p.value,
          upper:  p.upper ?? undefined,
          lower:  p.lower ?? undefined,
        })),
      ]
    : []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <InsightPanel insights={data.insights?.forecast ?? []} />

      {/* Controls */}
      <div className="glass p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Target Column</p>
          <select value={targetCol} onChange={(e) => setTargetCol(e.target.value)} className={s}>
            {recCols.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Forecast Periods: {periods}</p>
          <input type="range" min={3} max={36} step={1}
            value={periods} onChange={(e) => setPeriods(Number(e.target.value))} className="w-full mt-2" />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={() => onRun(targetCol, periods)} disabled={loading || !targetCol}>
            {loading ? <><Spinner size={14} /><span>Forecasting…</span></> : 'Run Forecast'}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs font-mono text-dim border border-border p-3">{error}</p>}

      {forecastResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          {/* Summary numbers */}
          {change !== null && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass p-4">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Last Actual</p>
                <p className="text-lg font-semibold text-white">{fmt(lastHistorical)}</p>
                <p className="text-[10px] font-mono text-white/20 mt-1">current baseline</p>
              </div>
              <div className="glass p-4">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">End of Forecast</p>
                <p className="text-lg font-semibold text-white">{fmt(lastForecast)}</p>
                <p className="text-[10px] font-mono text-white/20 mt-1">at period +{periods}</p>
              </div>
              <div className="glass p-4">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Projected Change</p>
                <p className={`text-lg font-semibold ${change > 0 ? 'text-white' : 'text-white/50'}`}>
                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </p>
                <p className="text-[10px] font-mono text-white/20 mt-1">vs current</p>
              </div>
              <div className="glass p-4">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Trained On</p>
                <p className="text-lg font-semibold text-white">{histLen}</p>
                <p className="text-[10px] font-mono text-white/20 mt-1">historical periods</p>
              </div>
            </div>
          )}

          {/* Plain-English forecast interpretation */}
          <div className="bg-surface border border-border p-4 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">Forecast Interpretation</p>
            <div className="space-y-2">
              {/* What it predicts */}
              {change !== null && (
                <p className="text-[11px] font-mono text-white/55 leading-relaxed">
                  {change > 5
                    ? `Based on ${histLen} periods of history, ${forecastResult.target_col} is projected to grow from ${fmt(lastHistorical)} to ${fmt(lastForecast)} over the next ${periods} periods — a ${change.toFixed(1)}% increase. If this trend holds, performance is on a positive trajectory.`
                    : change < -5
                    ? `Based on ${histLen} periods of history, ${forecastResult.target_col} is projected to decline from ${fmt(lastHistorical)} to ${fmt(lastForecast)} over the next ${periods} periods — a ${Math.abs(change).toFixed(1)}% drop. This decline should be investigated and addressed.`
                    : `Based on ${histLen} periods of history, ${forecastResult.target_col} is expected to remain relatively stable near ${fmt(lastForecast)} over the next ${periods} periods (${change > 0 ? '+' : ''}${change.toFixed(1)}% change).`
                  }
                </p>
              )}

              {/* Band width interpretation */}
              {bandWidthPct !== null && (
                <p className="text-[11px] font-mono text-white/40 leading-relaxed">
                  {bandWidthPct < 20
                    ? `Uncertainty is low — the 95% confidence band at period +${periods} is ${fmt(bandLow)} to ${fmt(bandHigh)}, a tight range of ${bandWidthPct.toFixed(0)}% around the forecast. The model is confident in this projection.`
                    : bandWidthPct < 60
                    ? `Moderate uncertainty — the 95% confidence band at period +${periods} spans ${fmt(bandLow)} to ${fmt(bandHigh)} (±${(bandWidthPct / 2).toFixed(0)}%). Actual results could differ from the forecast by this margin.`
                    : `High uncertainty — the 95% confidence band at period +${periods} spans ${fmt(bandLow)} to ${fmt(bandHigh)}, a wide range (${bandWidthPct.toFixed(0)}% of the forecast value). Use this forecast as directional guidance only.`
                  }
                </p>
              )}

              {/* Data quality for forecasting */}
              {histLen < 12 && (
                <p className="text-[11px] font-mono text-white/35 leading-relaxed">
                  ⚠ Only {histLen} historical periods available. Forecasts are more reliable with 20+ periods — current results may not capture seasonality or long-term cycles.
                </p>
              )}
              {histLen >= 24 && (
                <p className="text-[11px] font-mono text-white/35 leading-relaxed">
                  Good data depth — {histLen} periods gives the model enough history to capture trends and seasonality reliably.
                </p>
              )}
            </div>
          </div>

          {/* Trust signal */}
          {confidenceVal !== null && (
            <div className="glass p-4">
              <TrustBadge value={confidenceVal} type="confidence" />
              <p className="text-[10px] font-mono text-white/25 mt-2">
                Confidence is based on how closely the model fitted past data. The average residual error is {fmt(stdRes)} — that is the typical gap between the model's fitted values and actual historical values.
                {stdRes !== null && lastHistorical !== null && lastHistorical !== 0
                  ? ` As a percentage of the current value, that is ${((stdRes / Math.abs(lastHistorical)) * 100).toFixed(1)}%.`
                  : ''}
              </p>
            </div>
          )}

          {/* Main chart */}
          <div className="bg-surface border border-border p-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <p className="text-xs font-mono text-dim uppercase tracking-widest">
                  {forecastResult.target_col} — {periods} Period Forecast
                </p>
                <p className="text-[10px] font-mono text-white/20 mt-0.5">
                  Vertical line separates historical (solid) from forecast (dashed)
                </p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono text-white/25">
                <span className="flex items-center gap-1"><span className="w-4 h-px bg-white/60 inline-block" />Historical</span>
                <span className="flex items-center gap-1"><span className="w-4 h-px border-t border-dashed border-white/40 inline-block" />Forecast</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-white/10" />95% Band</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={chartData}>
                <XAxis dataKey="index" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} label={{ value: 'Period', position: 'insideBottom', offset: -2, fontSize: 9, fill: '#3f3f46' }} />
                <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} width={56} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#52525b' }} />
                <Area type="monotone" dataKey="upper" name="Upper 95%" fill="rgba(250,250,250,0.06)"
                  stroke="rgba(250,250,250,0.15)" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                <Area type="monotone" dataKey="lower" name="Lower 95%" fill="rgba(0,0,0,0)"
                  stroke="rgba(250,250,250,0.15)" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                <ReferenceLine x={histLen - 1} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4"
                  label={{ value: 'Forecast →', fill: '#52525b', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <Line type="monotone" dataKey="value"  name="Historical"        stroke="rgba(250,250,250,0.85)" dot={false} strokeWidth={2} connectNulls={false} />
                <Line type="monotone" dataKey="fitted" name="Forecast / Fitted" stroke="rgba(180,180,180,0.6)" dot={false} strokeWidth={1.5} strokeDasharray="6 3" connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Best / worst case summary */}
          {bandLow !== null && bandHigh !== null && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface border border-border p-4 text-center">
                <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1">Worst Case (95%)</p>
                <p className="text-lg font-semibold text-white/50">{fmt(bandLow)}</p>
                {lastHistorical !== null && lastHistorical !== 0 && (
                  <p className="text-[10px] font-mono text-white/20 mt-1">
                    {(((bandLow - lastHistorical) / Math.abs(lastHistorical)) * 100).toFixed(1)}% vs now
                  </p>
                )}
              </div>
              <div className="bg-surface border border-border p-4 text-center">
                <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1">Base Forecast</p>
                <p className="text-lg font-semibold text-white">{fmt(lastForecast)}</p>
                {change !== null && (
                  <p className="text-[10px] font-mono text-white/20 mt-1">
                    {change > 0 ? '+' : ''}{change.toFixed(1)}% vs now
                  </p>
                )}
              </div>
              <div className="bg-surface border border-border p-4 text-center">
                <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1">Best Case (95%)</p>
                <p className="text-lg font-semibold text-white/80">{fmt(bandHigh)}</p>
                {lastHistorical !== null && lastHistorical !== 0 && (
                  <p className="text-[10px] font-mono text-white/20 mt-1">
                    {(((bandHigh - lastHistorical) / Math.abs(lastHistorical)) * 100).toFixed(1)}% vs now
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Forecast table */}
          <div className="bg-surface border border-border overflow-x-auto">
            <p className="text-xs font-mono text-dim uppercase tracking-widest p-4 border-b border-border">
              Period-by-Period Forecast
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Period', 'Forecast', 'Worst Case (95%)', 'Best Case (95%)', 'vs Current'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-mono text-dim">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {forecastResult.forecasted.map((p, i) => {
                  const vsNow = lastHistorical !== null && lastHistorical !== 0 && p.value !== null
                    ? ((p.value - lastHistorical) / Math.abs(lastHistorical)) * 100
                    : null
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                      <td className="px-4 py-2 font-mono text-dim">+{i + 1}</td>
                      <td className="px-4 py-2 font-mono text-muted">{p.value !== null ? fmt(p.value) : '—'}</td>
                      <td className="px-4 py-2 font-mono text-dim">{p.lower !== null ? fmt(p.lower) : '—'}</td>
                      <td className="px-4 py-2 font-mono text-dim">{p.upper !== null ? fmt(p.upper) : '—'}</td>
                      <td className="px-4 py-2 font-mono">
                        {vsNow !== null
                          ? <span className={vsNow > 0 ? 'text-white/60' : 'text-white/35'}>{vsNow > 0 ? '+' : ''}{vsNow.toFixed(1)}%</span>
                          : '—'
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-[10px] font-mono text-white/20 p-3 border-t border-border">
              Worst / Best Case are the 95% confidence bounds — the model is 95% confident the actual value will fall within this range. "vs Current" shows the change relative to the last observed value.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
