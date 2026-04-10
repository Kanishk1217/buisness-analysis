import { useState, useEffect, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navbar }          from './components/Layout/Navbar'
import { Footer }          from './components/Layout/Footer'
import { DropZone }        from './components/Upload/DropZone'
import { UploadingScreen } from './components/Upload/UploadingScreen'
import { Tabs }            from './components/UI/Tabs'
import { SlotContent }     from './components/Dashboard/SlotContent'
import { PDFButton }       from './components/PDF/PDFButton'
import { useUpload }       from './hooks/useUpload'
import { useAnalysis }     from './hooks/useAnalysis'
import { pingServer }      from './api/client'
import type { Tab }        from './types'

export const RenameContext = createContext<Record<string, string>>({})
export function useRename() { return useContext(RenameContext) }
export function dn(col: string, map: Record<string, string>) { return map[col] ?? col }

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',      label: 'Overview'     },
  { id: 'trends',        label: 'Trends'       },
  { id: 'kpi',           label: 'KPI Analysis' },
  { id: 'distributions', label: 'Distributions'},
  { id: 'correlations',  label: 'Correlations' },
  { id: 'forecast',      label: 'Forecast'     },
  { id: 'segments',      label: 'Segments'     },
  { id: 'model',         label: 'ML Model'     },
  { id: 'story',         label: 'Story'        },
]

const ALL_TABS = new Set<Tab>(['overview','trends','kpi','distributions','correlations','forecast','segments','model','story'])

export default function App() {
  const { file, data, loading, error, upload, reset, restoredFilename } = useUpload()
  const analysis = useAnalysis(file)

  const [tab,         setTab]         = useState<Tab>('overview')
  const [serverReady, setReady]       = useState(false)
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set())

  useEffect(() => { pingServer().finally(() => setReady(true)) }, [])

  useEffect(() => {
    if (!data) setVisitedTabs(new Set())
  }, [data])

  function handleTabChange(newTab: Tab) {
    setTab(newTab)
    setVisitedTabs((prev) => {
      if (prev.has(newTab)) return prev
      const next = new Set(prev)
      next.add(newTab)
      return next
    })
  }

  // PDF unlock logic
  const missingSteps: string[] = []
  const unvisitedTabs = [...ALL_TABS].filter((t) => !visitedTabs.has(t))
  if (unvisitedTabs.length > 0) {
    const tabLabels = TABS.filter((t) => unvisitedTabs.includes(t.id)).map((t) => t.label)
    tabLabels.forEach((l) => missingSteps.push(`Visit ${l} tab`))
  }
  if (!analysis.kpiResult)      missingSteps.push('Run KPI Analysis')
  if (!analysis.forecastResult) missingSteps.push('Run Forecast')
  if (!analysis.segmentResult)  missingSteps.push('Run Segmentation')
  if (!analysis.trainResult)    missingSteps.push('Train ML Model')

  const pdfUnlocked = missingSteps.length === 0

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col">
      <div className="bg-orb bg-orb-1" aria-hidden="true" />
      <div className="bg-orb bg-orb-2" aria-hidden="true" />
      <div className="bg-orb bg-orb-3" aria-hidden="true" />
      <div className="noise"           aria-hidden="true" />

      <Navbar onReset={reset} />

      <AnimatePresence>
        {loading && file && <UploadingScreen filename={file.name} />}
      </AnimatePresence>

      <main id="main-content" className="relative z-10 flex-1 pt-14">
        <AnimatePresence mode="wait">
          {!data ? (
            /* ── Hero ── */
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-6 py-20"
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mb-6 flex items-center gap-2"
              >
                <div className="h-px w-8 bg-white/20 line-reveal" aria-hidden="true" />
                <span className="text-[11px] font-mono text-white/40 tracking-[0.2em] uppercase">Business Intelligence</span>
                <div className="h-px w-8 bg-white/20" aria-hidden="true" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="text-center font-bold leading-none tracking-tighter mb-4"
                style={{ fontSize: 'clamp(3.5rem, 10vw, 7rem)' }}
              >
                <span className="text-gradient glow-text">Know Your</span>
                <br />
                <span className="text-white/90">Business</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="text-center text-white/40 font-light max-w-lg mb-3 leading-relaxed"
                style={{ fontSize: '1.05rem' }}
              >
                Upload any business CSV and get instant answers — what's growing, what's declining, what to do next.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="text-center text-white/20 font-mono text-xs mb-10"
              >
                No data science knowledge required · Free
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                className="flex flex-wrap justify-center gap-2 mb-12"
              >
                {['Revenue Trends', 'Profit Forecasting', 'Customer Segments', 'Risk Detection', 'ML Predictions', 'Story Generator'].map((f, i) => (
                  <motion.span key={f}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    whileHover={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', scale: 1.02 }}
                    className="px-3 py-1 text-xs font-mono border border-white/[0.07] text-white/30 cursor-default transition-colors"
                  >{f}</motion.span>
                ))}
              </motion.div>

              <AnimatePresence>
                {!serverReady && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden"
                  >
                    <div className="glass px-5 py-3 space-y-2" role="status" aria-live="polite">
                      <div className="flex items-center gap-2.5">
                        <motion.div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0"
                          animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }} aria-hidden="true" />
                        <span className="text-[11px] font-mono text-white/70">Server is starting up — this takes ~30s on first visit</span>
                      </div>
                      <div className="h-px w-full bg-white/[0.06] overflow-hidden">
                        <motion.div className="h-full bg-white/30"
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 30, ease: 'linear' }}
                        />
                      </div>
                      <p className="text-[10px] font-mono text-white/35">Upload will work as soon as the bar fills — you can drop your file now</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-xl"
              >
                <DropZone onFile={upload} loading={loading} error={error} />
              </motion.div>
            </motion.div>

          ) : (
            /* ── Dashboard ── */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-7xl mx-auto px-4 py-6 space-y-4"
            >
              {/* ── Top bar ── */}
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="glass flex items-center justify-between px-5 py-3 relative overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
                  aria-hidden="true" />
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0"
                    style={{ boxShadow: '0 0 4px rgba(255,255,255,0.3)' }} />
                  <span className="text-xs font-mono text-white/60 truncate">
                    {file?.name ?? restoredFilename ?? ''}
                  </span>
                  {restoredFilename && !file && (
                    <span className="text-[10px] font-mono text-white/40 border border-white/[0.06] px-2 py-0.5 flex-shrink-0">
                      session restored · re-upload to run new analyses
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <PDFButton
                    unlocked={pdfUnlocked}
                    missingSteps={missingSteps}
                    filename={file?.name ?? restoredFilename ?? 'report'}
                    data={data}
                    corrResult={analysis.corrResult}
                    kpiResult={analysis.kpiResult}
                    forecastResult={analysis.forecastResult}
                    segmentResult={analysis.segmentResult}
                    trainResult={analysis.trainResult}
                    insightsResult={analysis.insightsResult}
                  />
                  <motion.button onClick={reset} aria-label="Close and reset" whileHover={{ color: 'rgba(255,255,255,0.9)' }}
                    className="text-xs font-mono text-white/50 transition-colors">
                    Close
                  </motion.button>
                </div>
              </motion.div>

              {/* ── Tab bar ── */}
              <div className="overflow-x-auto -mx-4 px-4 sm:overflow-visible sm:mx-0 sm:px-0">
                <Tabs tabs={TABS} active={tab} onChange={(t) => handleTabChange(t as Tab)} />
              </div>

              {/* ── Content ── */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <SlotContent
                    data={data}
                    file={file}
                    analysis={analysis}
                    tab={tab}
                    filename={file?.name ?? restoredFilename ?? ''}
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  )
}
