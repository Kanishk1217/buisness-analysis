import { useState } from 'react'
import { motion } from 'framer-motion'
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Button }    from '../UI/Button'
import { MetricBox } from '../UI/MetricBox'
import { Spinner }   from '../UI/Spinner'
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

export function MLModel({ uploadData, onTrain, result, loading, error }: Props) {
  const [target,   setTarget]   = useState(uploadData.columns[uploadData.columns.length - 1])
  const [algo,     setAlgo]     = useState('Random Forest')
  const [testSize, setTestSize] = useState(20)

  const isReg = uploadData.numeric_cols.includes(target)
  const algos = isReg ? REGRESSION_ALGOS : CLASSIFICATION_ALGOS
  const s     = 'w-full bg-surface border border-border text-muted text-xs font-mono px-3 py-2 focus:outline-none focus:border-dim'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bg-surface border border-border p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Target Column</p>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className={s}>
            {uploadData.columns.map((c) => <option key={c}>{c}</option>)}
          </select>
          <p className="text-xs font-mono text-dim mt-1">
            Task: <span className="text-muted">{isReg ? 'Regression' : 'Classification'}</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Algorithm</p>
          <select value={algo} onChange={(e) => setAlgo(e.target.value)} className={s}>
            {algos.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <p className="text-xs font-mono text-dim mb-1.5">Test Split: {testSize}%</p>
          <input
            type="range" min={10} max={40} step={5}
            value={testSize}
            onChange={(e) => setTestSize(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <Button
            className="w-full mt-3"
            onClick={() => onTrain(target, algo, testSize)}
            disabled={loading}
          >
            {loading ? <><Spinner size={14} /><span className="ml-2">Training…</span></> : 'Train Model'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-xs font-mono text-dim border border-border p-3">{error}</p>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBox label="Algorithm"     value={result.algorithm}      />
            <MetricBox label="Train Samples" value={result.train_samples}  />
            <MetricBox label="Test Samples"  value={result.test_samples}   />
            <MetricBox label="Features"      value={result.features}       />
          </div>

          {result.problem_type === 'regression' && result.metrics && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <MetricBox label="R² Score" value={result.metrics.r2   ?? '—'} />
                <MetricBox label="RMSE"     value={result.metrics.rmse ?? '—'} />
                <MetricBox label="MAE"      value={result.metrics.mae  ?? '—'} />
              </div>
              {result.actual_vs_predicted && (
                <div className="bg-surface border border-border p-4">
                  <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">Actual vs Predicted</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <ScatterChart>
                      <XAxis dataKey="actual"    name="Actual"    tick={{ fontSize: 10, fill: '#52525b' }} />
                      <YAxis dataKey="predicted" name="Predicted" tick={{ fontSize: 10, fill: '#52525b' }} />
                      <Tooltip {...TOOLTIP} />
                      <Scatter
                        data={result.actual_vs_predicted.actual.map((a, i) => ({
                          actual:    a,
                          predicted: result.actual_vs_predicted!.predicted[i],
                        }))}
                        fill="#fafafa"
                        fillOpacity={0.5}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {result.problem_type === 'classification' && result.metrics && (
            <>
              <MetricBox label="Accuracy" value={`${((result.metrics.accuracy ?? 0) * 100).toFixed(2)}%`} />
              {result.classification_report && (
                <div className="bg-surface border border-border overflow-x-auto">
                  <p className="text-xs font-mono text-dim uppercase tracking-widest p-4 border-b border-border">
                    Classification Report
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
                                {typeof vals === 'object'
                                  ? (vals as Record<string, number>)[m]?.toFixed(4)
                                  : '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
              {result.confusion_matrix && (
                <div className="bg-surface border border-border p-4">
                  <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">Confusion Matrix</p>
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse">
                      {result.confusion_matrix.map((row, i) => (
                        <tr key={i}>
                          {row.map((val, j) => {
                            const mx = Math.max(...result.confusion_matrix!.flat())
                            return (
                              <td
                                key={j}
                                className="w-12 h-12 text-center font-mono border border-border"
                                style={{ backgroundColor: `rgba(250,250,250,${val / mx * 0.6})` }}
                              >
                                {val}
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
              <div className="space-y-2">
                {result.feature_importance.features.slice(0, 15).map((feat, i) => {
                  const score = result.feature_importance!.scores[i]
                  const maxScore = result.feature_importance!.scores[0]
                  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0
                  return (
                    <div key={feat} className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-dim w-32 truncate flex-shrink-0">{feat}</span>
                      <div className="flex-1 h-1 bg-white/[0.06] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.03 }}
                          className="h-full bg-white/40"
                        />
                      </div>
                      <span className="text-[11px] font-mono text-dim w-14 text-right">
                        {(score * 100).toFixed(2)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
