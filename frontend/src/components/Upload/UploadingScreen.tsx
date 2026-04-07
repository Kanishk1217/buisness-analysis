import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STEPS = [
  { label: 'Reading file structure',         duration: 800  },
  { label: 'Detecting business context',     duration: 1200 },
  { label: 'Computing KPIs and trends',      duration: 1000 },
  { label: 'Running anomaly detection',      duration: 700  },
]

interface Props {
  filename: string
}

function DataStream() {
  const chars = '01アイウエオabcdef∑∂∫∆'
  const cols  = 18
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {Array.from({ length: cols }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-0 flex flex-col gap-1"
          style={{ left: `${(i / cols) * 100}%` }}
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: '110vh', opacity: [0, 0.15, 0.15, 0] }}
          transition={{
            duration: 3 + Math.random() * 3,
            delay:    Math.random() * 2,
            repeat:   Infinity,
            ease:     'linear',
          }}
        >
          {Array.from({ length: 12 }).map((_, j) => (
            <span key={j} className="text-[10px] font-mono text-primary/30 leading-4">
              {chars[Math.floor(Math.random() * chars.length)]}
            </span>
          ))}
        </motion.div>
      ))}
    </div>
  )
}

export function UploadingScreen({ filename }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [progress,  setProgress]  = useState(0)
  const [elapsed,   setElapsed]   = useState(0)

  useEffect(() => {
    let total = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    STEPS.forEach((step, i) => {
      timers.push(setTimeout(() => setStepIndex(i), total))
      total += step.duration
    })
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    const start  = performance.now()
    const target = 90
    const duration = 3500
    let raf: number
    const tick = (now: number) => {
      const t     = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setProgress(Math.round(eased * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 100)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div
      key="uploading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: 'blur(8px)' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 bg-bg flex flex-col items-center justify-center z-40 overflow-hidden"
    >
      <DataStream />

      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(250,250,250,0.04) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-sm px-6 space-y-8">

        <div className="flex justify-center">
          <div className="relative w-16 h-16 border border-border flex items-center justify-center">
            {['top-0 left-0 border-t-2 border-l-2',
              'top-0 right-0 border-t-2 border-r-2',
              'bottom-0 left-0 border-b-2 border-l-2',
              'bottom-0 right-0 border-b-2 border-r-2'].map((c, i) => (
              <motion.div
                key={i}
                className={`absolute w-3 h-3 border-primary ${c}`}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
            <motion.svg
              width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" className="text-primary"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </motion.svg>
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs font-mono text-dim uppercase tracking-widest">Analyzing</p>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-base font-semibold text-primary truncate px-4"
          >
            {filename}
          </motion.p>
        </div>

        <div className="space-y-2">
          <div className="h-px w-full bg-border overflow-hidden">
            <motion.div
              className="h-full bg-primary relative"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <motion.div
                className="absolute right-0 top-0 h-full w-8 bg-gradient-to-r from-transparent to-white/60"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </motion.div>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] font-mono text-dim">{progress}%</span>
            <span className="text-[10px] font-mono text-dim">{(elapsed / 10).toFixed(1)}s</span>
          </div>
        </div>

        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const done    = i < stepIndex
            const current = i === stepIndex
            const pending = i > stepIndex
            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: pending ? 0.3 : 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                className="flex items-center gap-3"
              >
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <AnimatePresence mode="wait">
                    {done ? (
                      <motion.svg
                        key="check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0 }}
                        width="14" height="14" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5"
                        className="text-primary"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </motion.svg>
                    ) : current ? (
                      <motion.div
                        key="spin"
                        className="w-3 h-3 border border-primary border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                      />
                    ) : (
                      <motion.div key="dot" className="w-1.5 h-1.5 rounded-full bg-border" />
                    )}
                  </AnimatePresence>
                </div>
                <span className={`text-xs font-mono transition-colors ${done ? 'text-muted' : current ? 'text-primary' : 'text-dim'}`}>
                  {step.label}
                </span>
                {done && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="ml-auto text-[10px] font-mono text-dim"
                  >
                    done
                  </motion.span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
