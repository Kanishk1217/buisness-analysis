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

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ color }: { color: string }) {
  return (
    <motion.div
      className={`w-3 h-3 rounded-full border ${color}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
  )
}

// ── ThemeButton ───────────────────────────────────────────────────────────────
interface ThemeButtonProps {
  theme:      'dark' | 'light'
  onClick:    () => void
  generating: boolean
}

function ThemeButton({ theme, onClick, generating }: ThemeButtonProps) {
  const isDark = theme === 'dark'

  const baseClass = isDark
    ? 'border border-violet-500/60 text-violet-300 hover:border-violet-400/80 hover:text-violet-200'
    : 'border border-violet-400/50 text-violet-200 hover:border-violet-300/70 hover:text-violet-100'

  const shimmerGrad = isDark
    ? 'linear-gradient(105deg, transparent 40%, rgba(139,92,246,0.18) 50%, transparent 60%)'
    : 'linear-gradient(105deg, transparent 40%, rgba(109,40,217,0.18) 50%, transparent 60%)'

  const spinnerColor = isDark
    ? 'border-violet-400/60 border-t-violet-300'
    : 'border-violet-300/60 border-t-violet-200'

  return (
    <motion.button
      onClick={onClick}
      disabled={generating}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className={[
        'relative overflow-hidden flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono',
        'transition-all duration-200 select-none cursor-pointer',
        baseClass,
      ].join(' ')}
      aria-label={`Export PDF in ${theme} theme`}
    >
      {/* shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: shimmerGrad, backgroundSize: '200% 100%' }}
        animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
      />

      {generating ? (
        <>
          <Spinner color={spinnerColor} />
          <span>...</span>
        </>
      ) : isDark ? (
        <>
          {/* Moon icon */}
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
            <path
              d="M9 6.5A4 4 0 1 1 4.5 2a3 3 0 0 0 4.5 4.5Z"
              stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          <span>Dark</span>
        </>
      ) : (
        <>
          {/* Sun icon */}
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
            <circle cx="5.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.1"/>
            <path
              d="M5.5 1v1M5.5 9v1M1 5.5h1M9 5.5h1M2.4 2.4l.7.7M7.9 7.9l.7.7M7.9 2.4l-.7.7M2.4 7.9l.7-.7"
              stroke="currentColor" strokeWidth="1" strokeLinecap="round"
            />
          </svg>
          <span>Light</span>
        </>
      )}
    </motion.button>
  )
}

// ── PDFButton ─────────────────────────────────────────────────────────────────
export function PDFButton({
  unlocked, missingSteps, filename, data,
  corrResult, kpiResult, forecastResult, segmentResult, trainResult, insightsResult
}: Props) {
  const [generatingDark,  setGeneratingDark]  = useState(false)
  const [generatingLight, setGeneratingLight] = useState(false)
  const [showTip,         setShowTip]         = useState(false)
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doneCount = TOTAL_STEPS - missingSteps.length
  const pct       = Math.round((doneCount / TOTAL_STEPS) * 100)

  function generate(theme: 'dark' | 'light') {
    if (!unlocked) return
    if (theme === 'dark'  && generatingDark)  return
    if (theme === 'light' && generatingLight) return

    const setter = theme === 'dark' ? setGeneratingDark : setGeneratingLight
    setter(true)
    setTimeout(() => {
      try {
        generateBusinessPDF(
          { filename, data, corrResult, kpiResult, forecastResult, segmentResult, trainResult, insightsResult },
          theme
        )
      } finally {
        setter(false)
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
      {unlocked ? (
        /* Two side-by-side theme buttons */
        <div className="flex items-center gap-1.5">
          <ThemeButton theme="dark"  onClick={() => generate('dark')}  generating={generatingDark} />
          <ThemeButton theme="light" onClick={() => generate('light')} generating={generatingLight} />
        </div>
      ) : (
        /* Locked state */
        <motion.button
          disabled
          aria-label={`PDF locked -- ${missingSteps.length} steps remaining`}
          className="relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono
                     border border-white/[0.08] text-white/25 cursor-default select-none"
        >
          <svg width="10" height="11" viewBox="0 0 10 11" fill="none" aria-hidden="true">
            <rect x="1.5" y="4.5" width="7" height="6" rx="1" stroke="currentColor" strokeWidth="1.1"/>
            <path d="M3 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.1"/>
          </svg>
          <span>PDF {pct}%</span>
        </motion.button>
      )}

      {/* Tooltip (locked only) */}
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
                  <li className="text-[10px] font-mono text-white/30">+{missingSteps.length - 8} more...</li>
                )}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
