import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts'
import { Button }       from '../UI/Button'
import { MetricBox }    from '../UI/MetricBox'
import { Spinner }      from '../UI/Spinner'
import { TrustBadge }  from '../UI/TrustBadge'
import { fmt, fmtAxis } from '../../utils/format'
import type { UploadResponse, TrainResponse } from '../../types'

const REGRESSION_ALGOS     = ['Linear Regression', 'Ridge Regression', 'Decision Tree', 'Random Forest', 'Gradient Boosting']
const CLASSIFICATION_ALGOS = ['Logistic Regression', 'Decision Tree', 'Random Forest', 'Gradient Boosting']

const TOOLTIP = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle:   { color: '#a1a1aa' },
  itemStyle:    { color: '#fafafa' },
}

interface Props {
  uploadData: UploadResponse
  onTrain:    (target: string, algo: string, testSize: number) => void
  result:     TrainResponse | null
  loading:    boolean
  error:      string | null
}

function useSmartRec(uploadData: UploadResponse) {
  return useMemo(() => {
    const rows        = uploadData.shape[0]
    const targetCol   = uploadData.recommendations?.ml_default_target
                        ?? uploadData.columns.slice(-1)[0]
                        ?? uploadData.columns[0]
    const isNumTarget = uploadData.numeric_cols.includes(targetCol)
    const taskType    = isNumTarget ? 'regression' : 'classification'

    // Backend-recommended target rationale
    const isBackendRec = !!(uploadData.recommendations?.ml_default_target)
    const targetReason = isBackendRec
      ? `"${targetCol}" was identified by the backend as the most likely prediction target based on column names and types.`
      : `"${targetCol}" is the last column — a common convention for the prediction target.`

    // Algorithm by dataset size
    let algo: string, algoReason: string
    if (taskType === 'regression') {
      if (rows < 300)       { algo = 'Linear Regression';  algoReason = `Small dataset (${rows.toLocaleString()} rows) — linear models generalise better and avoid overfitting.` }
      else if (rows < 5000) { algo = 'Random Forest';      algoReason = `Medium dataset (${rows.toLocaleString()} rows) — Random Forest handles non-linear patterns well without heavy tuning.` }
      else                  { algo = 'Gradient Boosting';  algoReason = `Large dataset (${rows.toLocaleString()} rows) — Gradient Boosting delivers top accuracy at scale.` }
    } else {
      if (rows < 300)       { algo = 'Logistic Regression'; algoReason = `Small dataset (${rows.toLocaleString()} rows) — Logistic Regression is stable and interpretable.` }
      else if (rows < 5000) { algo = 'Random Forest';       algoReason = `Medium dataset (${rows.toLocaleString()} rows) — Random Forest is robust to noise out of the box.` }
      else                  { algo = 'Gradient Boosting';   algoReason = `Large dataset (${rows.toLocaleString()} rows) — Gradient Boosting typically achieves the highest accuracy at scale.` }
    }

    const warnings: string[] = []
    if (rows < 100)
      warnings.push(`Very small dataset (${rows} rows) — results may not generalise. Collect more data for reliable predictions.`)
    if (uploadData.missing_total > 0)
      warnings.push(`${uploadData.missing_total.toLocaleString()} missing values detected. The model auto-imputes them, but preprocessing first gives better results.`)
    if (uploadData.duplicates > 0)
      warnings.push(`${uploadData.duplicates} duplicate rows inflate training metrics. Remove them in the data pipeline.`)

    return { targetCol, targetReason, algo, algoReason, taskType, warnings }
  }, [uploadData])
}

export function MLModel({ uploadData, onTrain, result, loading, error }: Props) {
  const rec       = useSmartRec(uploadData)
  const mlTargets = uploadData.recommendations?.ml_targets ?? uploadData.columns
  const s         = 'w-full bg-surface border border-border text-muted text-xs font-mono px-3 py-2 focus:outline-none focus:border-dim'

  const [target,   setTarget]   = useState(rec.targetCol)
  const [algo,     setAlgo]     = useState(rec.algo)
  const [testSize, setTestSize] = useState(20)

  const isReg = uploadData.numeric_cols.includes(target)
  const algos = isReg ? REGRESSION_ALGOS : CLASSIFICATION_ALGOS

  const avpData = result?.actual_vs_predicted
    ? result.actual_vs_predicted.actual.map((a, i) => ({
        actual:    a,
        predicted: result.actual_vs_predicted!.predicted[i],
      }))
    : []

  const allVals = avpData.flatMap((d) => [d.actual, d.predicted])
  const minVal  = allVals.length ? Math.min(...allVals) : 0
  const maxVal  = allVals.length ? Math.max(...allVals) : 1
  const refLine = [{ x: minVal, y: minVal }, { x: maxVal, y: maxVal }]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* ── Smart Recommendation Panel ── */}
      <div className="bg-surface border border-border p-4 space-y-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">Smart Training Recommendation</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass p-3 space-y-1.5">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Recommended Target</p>
            <p className="text-sm font-mono text-white/80">{rec.targetCol}</p>
            <p className="text-[10px] font-mono text-white/35 leading-relaxed">{rec.targetReason}</p>
            <span className="inline-block text-[9px] font-mono border border-white/10 px-1.5 py-0.5 text-white/30 uppercase tracking-widest">
              {rec.taskType === 'regression' ? 'Regression — numeric output' : 'Classification — category output'}
            </span>
          </div>

          <div className="glass p-3 space-y-1.5">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Recommended Algorithm</p>
            <p className="text-sm font-mono text-white/80">{rec.algo}</p>
            <p className="text-[10px] font-mono text-white/35 leading-relaxed">{rec.algoReason}</p>
            <span className="inline-block text-[9px] font-mono border border-white/10 px-1.5 py-0.5 text-white/30 uppercase tracking-widest">
              {uploadData.shape[0].toLocaleString()} rows · {mlTargets.length - 1} features
            </span>
          </div>
        </div>

        {rec.warnings.length > 0 && (
          <ul className="space-y-1.5 border-t border-white/[0.06] pt-3">
            {rec.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-[10px] font-mono text-white/40 leading-relaxed">
                <span className="text-white/20 flex-shrink-0">⚠</span><span>{w}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-[10px] font-mono text-white/20">
          These suggestions are based on your data shape and column names. Experiment with different targets and algorithms below.
        </p>
      </div>

      {/* ── Controls ── */}
      <div className="bg-surface border border-border p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Target Column</p>
          <select value={target} onChange={(e) => { setTarget(e.target.value); setAlgo('Random Forest') }} className={s}>
            {mlTargets.map((c) => (
              <option key={c} value={c}>{c}{c === rec.targetCol ? ' (recommended)' : ''}</option>
            ))}
          </select>
          <p className="text-xs font-mono text-dim mt-1">
            Task: <span className="text-muted">{isReg ? 'Regression' : 'Classification'}</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Algorithm</p>
          <select value={algo} onChange={(e) => setAlgo(e.target.value)} className={s}>
            {algos.map((a) => (
              <option key={a} value={a}>{a}{a === rec.algo ? ' (recommended)' : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Test Split: {testSize}%</p>
          <input type="range" min={10} max={40} step={5} value={testSize}
            onChange={(e) => setTestSize(Number(e.target.value))} className="w-full accent-primary" />
          <p className="text-[10px] font-mono text-white/20 mt-1">
            {Math.round(uploadData.shape[0] * (1 - testSize / 100))} train · {Math.round(uploadData.shape[0] * testSize / 100)} test rows
          </p>
          <Button className="w-full mt-3" onClick={() => onTrain(target, algo, testSize)} disabled={loading}>
            {loading ? <><Spinner size={14} /><span className="ml-2">Training…</span></> : 'Train Model'}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs font-mono text-dim border border-border p-3">{error}</p>}

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBox label="Algorithm"     value={result.algorithm}     />
            <MetricBox label="Train Samples" value={result.train_samples} />
            <MetricBox label="Test Samples"  value={result.test_samples}  />
            <MetricBox label="Features"      value={result.features}      />
          </div>

          {/* ── Regression ── */}
          {result.problem_type === 'regression' && result.metrics && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="glass p-4 space-y-3">
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">R² Score</p>
                  <p className="text-2xl font-semibold text-white">{result.metrics.r2?.toFixed(4) ?? '—'}</p>
                  <TrustBadge value={result.metrics.r2} type="r2" />
                </div>
                <div className="glass p-4">
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">RMSE</p>
                  <p className="text-2xl font-semibold text-white">{fmt(result.metrics.rmse)}</p>
                  <p className="text-[10px] font-mono text-white/20 mt-1">avg error in target units</p>
                </div>
                <div className="glass p-4">
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">MAE</p>
                  <p className="text-2xl font-semibold text-white">{fmt(result.metrics.mae)}</p>
                  <p className="text-[10px] font-mono text-white/20 mt-1">mean absolute error</p>
                </div>
              </div>

              {/* Personalized What This Means */}
              <div className="glass p-4 space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-2">What This Means</p>
                <ul className="space-y-2">
                  {(() => {
                    const r2    = result.metrics.r2 ?? 0
                    const rmse  = result.metrics.rmse ?? 0
                    const total = result.train_samples + result.test_samples
                    const items: string[] = []

                    if (r2 >= 0.9)
                      items.push(`R² = ${r2.toFixed(3)} — the model explains ${(r2*100).toFixed(1)}% of variance in "${target}". Excellent predictive power for business forecasting.`)
                    else if (r2 >= 0.7)
                      items.push(`R² = ${r2.toFixed(3)} — the model explains ${(r2*100).toFixed(1)}% of variance in "${target}". Good fit; some unexplained variance remains.`)
                    else if (r2 >= 0.5)
                      items.push(`R² = ${r2.toFixed(3)} — moderate fit. Try Gradient Boosting, or add more business features (seasonality, category flags) to improve.`)
                    else
                      items.push(`R² = ${r2.toFixed(3)} — only ${(r2*100).toFixed(1)}% of variance explained. "${target}" may not be predictable from these columns alone.`)

                    if (rmse > 0)
                      items.push(`RMSE = ${fmt(rmse)} — predictions are on average ±${fmt(rmse)} from the actual "${target}" value.`)

                    if (r2 > 0.95)
                      items.push('Very high R² — verify there is no data leakage (a column that directly encodes the target).')

                    if (total < 200)
                      items.push(`Only ${total} total rows — model results may not generalise. More data would improve confidence.`)

                    if (result.feature_importance) {
                      const top      = result.feature_importance.features[0]
                      const topScore = result.feature_importance.scores[0]
                      if (topScore > 0.4)
                        items.push(`"${top}" drives ${(topScore * 100).toFixed(0)}% of predictions — this is your most influential business lever.`)
                    }

                    return items.map((it, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs font-mono text-white/60 leading-relaxed">
                        <span className="text-white/20 mt-0.5 flex-shrink-0">›</span><span>{it}</span>
                      </li>
                    ))
                  })()}
                </ul>
              </div>

              {avpData.length > 0 && (
                <div className="bg-surface border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono text-dim uppercase tracking-widest">Actual vs Predicted — {target}</p>
                    <p className="text-[10px] font-mono text-white/25">Dots closer to line = better accuracy</p>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart>
                      <XAxis dataKey="x" type="number" domain={[minVal, maxVal]} tickFormatter={fmtAxis}
                        tick={{ fontSize: 10, fill: '#52525b' }} name="Actual" />
                      <YAxis dataKey="y" type="number" domain={[minVal, maxVal]} tickFormatter={fmtAxis}
                        tick={{ fontSize: 10, fill: '#52525b' }} name="Predicted" />
                      <Tooltip {...TOOLTIP} formatter={(v: number) => fmt(v)} />
                      <Line data={refLine} dataKey="y" dot={false} stroke="rgba(255,255,255,0.15)"
                        strokeWidth={1.5} strokeDasharray="4 4" legendType="none" />
                      <Scatter data={avpData} fill="rgba(250,250,250,0.5)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] font-mono text-white/25">
                    The dashed diagonal is the "perfect prediction" line.
                    {avpData.length > 0 && (() => {
                      const errors = avpData.map(d => Math.abs(d.actual - d.predicted))
                      const pct10  = errors.filter(e => e <= (maxVal - minVal) * 0.1).length
                      return ` ${((pct10 / avpData.length) * 100).toFixed(0)}% of predictions are within 10% of the actual range.`
                    })()}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Classification ── */}
          {result.problem_type === 'classification' && result.metrics && (
            <>
              <div className="glass p-5">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Accuracy</p>
                <p className="text-3xl font-semibold text-white">
                  {((result.metrics.accuracy ?? 0) * 100).toFixed(1)}%
                </p>
                <TrustBadge value={result.metrics.accuracy ?? 0} type="accuracy" />
                <div className="mt-3 h-1 bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(result.metrics.accuracy ?? 0) * 100}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full bg-white/50"
                  />
                </div>
              </div>

              {/* Personalized What This Means */}
              <div className="glass p-4 space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-2">What This Means</p>
                <ul className="space-y-2">
                  {(() => {
                    const acc   = result.metrics.accuracy ?? 0
                    const total = result.train_samples + result.test_samples
                    const items: string[] = []

                    if (acc >= 0.95)
                      items.push(`Accuracy = ${(acc*100).toFixed(1)}% — near-perfect classification of "${target}". Verify there's no data leakage.`)
                    else if (acc >= 0.8)
                      items.push(`Accuracy = ${(acc*100).toFixed(1)}% — the model correctly classifies "${target}" for ${Math.round(acc * result.test_samples)} of ${result.test_samples} test rows. Solid business performance.`)
                    else if (acc >= 0.65)
                      items.push(`Accuracy = ${(acc*100).toFixed(1)}% — moderate performance on "${target}". Try Gradient Boosting or gather more labelled examples.`)
                    else
                      items.push(`Accuracy = ${(acc*100).toFixed(1)}% on "${target}" — below baseline. Check class balance and consider if enough features are available.`)

                    if (total < 200)
                      items.push(`Only ${total} rows total — classification needs more examples to learn reliable decision boundaries.`)

                    if (result.feature_importance) {
                      const top      = result.feature_importance.features[0]
                      const topScore = result.feature_importance.scores[0]
                      if (topScore > 0.4)
                        items.push(`"${top}" is the strongest signal (${(topScore * 100).toFixed(0)}% importance) — focus data collection efforts here.`)
                    }

                    return items.map((it, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs font-mono text-white/60 leading-relaxed">
                        <span className="text-white/20 mt-0.5 flex-shrink-0">›</span><span>{it}</span>
                      </li>
                    ))
                  })()}
                </ul>
              </div>

              {result.classification_report && (
                <div className="bg-surface border border-border overflow-x-auto">
                  <p className="text-xs font-mono text-dim uppercase tracking-widest p-4 border-b border-border">
                    Classification Report — "{target}"
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        {['Class', 'Precision', 'Recall', 'F1-Score', 'Support'].map((h) => (
                          <th key={h} className="px-4 py-2 text-left font-mono text-dim">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result.classification_report)
                        .filter(([k]) => !['accuracy', 'macro avg', 'weighted avg'].includes(k))
                        .map(([cls, vals]) => (
                          <tr key={cls} className="border-b border-border/50 hover:bg-surface2">
                            <td className="px-4 py-2 font-mono text-muted">{cls}</td>
                            {['precision', 'recall', 'f1-score', 'support'].map((m) => (
                              <td key={m} className="px-4 py-2 font-mono text-muted">
                                {typeof vals === 'object' ? (vals as Record<string, number>)[m]?.toFixed(3) : '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] font-mono text-white/20 p-4">
                    Precision = when the model predicts a class, how often it's right. Recall = of all actual cases, how many the model caught. F1 = balance of both. Low support = few training examples for that class.
                  </p>
                </div>
              )}

              {result.confusion_matrix && (
                <div className="bg-surface border border-border p-4 space-y-3">
                  <p className="text-xs font-mono text-dim uppercase tracking-widest">Confusion Matrix</p>
                  <p className="text-[10px] font-mono text-white/25">Diagonal cells = correct predictions. Off-diagonal = model mistakes.</p>
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse">
                      {result.confusion_matrix.map((row, i) => (
                        <tr key={i}>
                          {row.map((val, j) => {
                            const mx = Math.max(...result.confusion_matrix!.flat())
                            const isCorrect = i === j
                            return (
                              <td key={j} className="w-14 h-14 text-center font-mono border border-border"
                                style={{ backgroundColor: `rgba(${isCorrect ? '250,250,250' : '100,130,180'},${val / Math.max(mx, 1) * 0.7})` }}>
                                <span className="font-semibold">{val}</span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Feature importance */}
          {result.feature_importance && (
            <div className="bg-surface border border-border p-4">
              <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">Feature Importance</p>
              <div className="space-y-2.5">
                {result.feature_importance.features.slice(0, 15).map((feat, i) => {
                  const score    = result.feature_importance!.scores[i]
                  const maxScore = result.feature_importance!.scores[0]
                  const pct      = maxScore > 0 ? (score / maxScore) * 100 : 0
                  return (
                    <div key={feat} className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-dim w-28 truncate flex-shrink-0">{feat}</span>
                      <div className="flex-1 h-1 bg-white/[0.06] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.03 }}
                          className="h-full bg-white/40"
                        />
                      </div>
                      <span className="text-[11px] font-mono text-dim w-12 text-right">{(score * 100).toFixed(1)}%</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] font-mono text-white/20 mt-4">
                Feature importance shows which columns drive the model's predictions most. Focus improvement efforts on the top-ranked columns.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
