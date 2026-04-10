import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateBusinessPDF } from './generatePDF'
import type {
  UploadResponse, CorrelationResponse, KpiResponse,
  ForecastResponse, SegmentResponse, TrainResponse, InsightsResponse
} from '../../types/index'

interface Props {
  unlocked:       boolean
  missingSteps:   string[]
  filename:       string
  data:           UploadResponse
  corrResult:     CorrelationResponse | null
  kpiResult:      KpiResponse | null
  forecastResult: ForecastResponse | null
  segmentResult:  SegmentResponse | null
  trainResult:    TrainResponse | null
  insightsResult: InsightsResponse | null
}

const TOTAL_STEPS = 13 // 9 tabs + 4 analyses

export function PDFButton({
  unlocked, missingSteps, filename, data,
  corrResult, kpiResult, forecastResult, segmentResult, trainResult, insightsResult
}: Props) {
  const [generating, setGenerating] = useState(false)
  const [showTip,    setShowTip]    = useState(false)
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doneCount  = TOTAL_STEPS - missingSteps.length
  const pct        = Math.round((doneCount / TOTAL_STEPS) * 100)

  function handleClick() {
    if (!unlocked || generating) return
    setGenerating(true)
    setTimeout(() => {
      try {
        generateBusinessPDF({
          filename, data, corrResult, kpiResult,
          forecastResult, segmentResult, trainResult, insightsResult
        })
      } finally {
        setGenerating(false)
      }
    }, 50)
  }

  function handleMouseEnter() {
    if (unlocked) return
    if (tipTimer.current) clearTimeout(tipTimer.current)
    setShowTip(true)
  }
  function handleMouseLeave() {
    tipTimer.current = setTimeout(() => setShowTip(false), 200)
  }

  return (
    <div className="relative flex-shrink-0" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <motion.button
        onClick={handleClick}
        disabled={!unlocked || generating}
        aria-label={unlocked ? 'Download PDF report' : `PDF locked — ${missingSteps.length} steps remaining`}
        whileHover={unlocked ? { scale: 1.03 } : {}}
        whileTap={unlocked ? { scale: 0.97 } : {}}
        className={[
          'relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-all duration-200 select-none',
          unlocked
            ? 'border border-violet-500/60 text-violet-300 hover:border-violet-400/80 hover:text-violet-200 cursor-pointer'
            : 'border border-white/[0.08] text-white/25 cursor-default'
        ].join(' ')}
      >
        {/* shimmer overlay when unlocked */}
        {unlocked && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(139,92,246,0.18) 50%, transparent 60%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {generating ? (
          <>
            <motion.div
              className="w-3 h-3 rounded-full border border-violet-400/60 border-t-violet-300"
              animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
            <span>Generating…</span>
          </>
        ) : unlocked ? (
          <>
            {/* PDF icon */}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="7" height="10" rx="1" stroke="currentColor" strokeWidth="1.1"/>
              <path d="M3 4h5M3 6h5M3 8h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              <path d="M8 1v3h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Export PDF</span>
          </>
        ) : (
          <>
            {/* lock icon */}
            <svg width="10" height="11" viewBox="0 0 10 11" fill="none" aria-hidden="true">
              <rect x="1.5" y="4.5" width="7" height="6" rx="1" stroke="currentColor" strokeWidth="1.1"/>
              <path d="M3 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.1"/>
            </svg>
            <span>PDF {pct}%</span>
          </>
        )}
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTip && !unlocked && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-64 glass border border-white/[0.08] p-3 space-y-2.5"
            role="tooltip"
          >
            {/* progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/40">PDF Progress</span>
                <span className="text-[10px] font-mono text-violet-400">{pct}%</span>
              </div>
              <div className="h-0.5 w-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full bg-violet-500/70"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            {/* remaining steps */}
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider">To unlock:</p>
              <ul className="space-y-0.5">
                {missingSteps.slice(0, 8).map((step) => (
                  <li key={step} className="flex items-center gap-1.5 text-[10px] font-mono text-white/50">
                    <div className="w-1 h-1 rounded-full bg-violet-500/50 flex-shrink-0" />
                    {step}
                  </li>
                ))}
                {missingSteps.length > 8 && (
                  <li className="text-[10px] font-mono text-white/30">+{missingSteps.length - 8} more…</li>
                )}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
