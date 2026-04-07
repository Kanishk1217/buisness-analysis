import { useState, useEffect, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navbar }          from './components/Layout/Navbar'
import { Footer }          from './components/Layout/Footer'
import { DropZone }        from './components/Upload/DropZone'
import { UploadingScreen } from './components/Upload/UploadingScreen'
import { Tabs }            from './components/UI/Tabs'
import { AlertBanner }     from './components/UI/AlertBanner'
import { ColumnRenamer }   from './components/UI/ColumnRenamer'
import { Overview }        from './components/Dashboard/Overview'
import { Trends }          from './components/Dashboard/Trends'
import { KPIAnalysis }     from './components/Dashboard/KPIAnalysis'
import { Distributions }   from './components/Dashboard/Distributions'
import { Correlations }    from './components/Dashboard/Correlations'
import { Forecast }        from './components/Dashboard/Forecast'
import { Segments }        from './components/Dashboard/Segments'
import { MLModel }         from './components/Dashboard/MLModel'
import { Story }           from './components/Dashboard/Story'
import { useUpload }       from './hooks/useUpload'
import { useAnalysis }     from './hooks/useAnalysis'
import { pingServer }      from './api/client'
import type { Tab }        from './types'

// ── Rename context ──────────────────────────────────────────────
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

export default function App() {
  const { file, data, loading: uploading, error: uploadError, upload, reset, restoredFilename } = useUpload()
  const analysis = useAnalysis(file)

  const [tab,         setTab]    = useState<Tab>('overview')
  const [serverReady, setReady]  = useState(false)
  const [renameMap,   setRenameMap] = useState<Record<string, string>>({})

  useEffect(() => {
    pingServer().finally(() => setReady(true))
  }, [])

  return (
    <RenameContext.Provider value={renameMap}>
    <div className="relative min-h-screen bg-black text-white flex flex-col">
      <div className="bg-orb bg-orb-1" aria-hidden="true" />
      <div className="bg-orb bg-orb-2" aria-hidden="true" />
      <div className="bg-orb bg-orb-3" aria-hidden="true" />
      <div className="noise"           aria-hidden="true" />

      <Navbar />

      <AnimatePresence>
        {uploading && file && <UploadingScreen filename={file.name} />}
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
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mb-6 flex items-center gap-2"
              >
                <div className="h-px w-8 bg-white/20 line-reveal" aria-hidden="true" />
                <span className="text-[11px] font-mono text-white/40 tracking-[0.2em] uppercase">Business Intelligence</span>
                <div className="h-px w-8 bg-white/20" aria-hidden="true" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="text-center font-bold leading-none tracking-tighter mb-4"
                style={{ fontSize: 'clamp(3.5rem, 10vw, 7rem)' }}
              >
                <span className="text-gradient glow-text">Know Your</span>
                <br />
                <span className="text-white/90">Business</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="text-center text-white/40 font-light max-w-lg mb-3 leading-relaxed"
                style={{ fontSize: '1.05rem' }}
              >
                Upload any business CSV and get instant answers — what's growing, what's declining, what to do next.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center text-white/20 font-mono text-xs mb-10"
              >
                No data science knowledge required · Results in seconds · Free
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                className="flex flex-wrap justify-center gap-2 mb-12"
              >
                {['Revenue Trends', 'Profit Forecasting', 'Customer Segments', 'Risk Detection', 'ML Predictions', 'Data Story'].map((f, i) => (
                  <motion.span key={f}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    whileHover={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', scale: 1.02 }}
                    className="px-3 py-1 text-xs font-mono border border-white/[0.07] text-white/30 cursor-default transition-colors"
                  >{f}</motion.span>
                ))}
              </motion.div>

              <AnimatePresence>
                {!serverReady && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 text-[11px] font-mono text-white/25 glass px-4 py-2.5" role="status" aria-live="polite">
                      <motion.div className="w-1 h-1 rounded-full bg-white/40"
                        animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity }} aria-hidden="true" />
                      Waking up server — first load may take ~30s
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-xl"
              >
                <DropZone onFile={upload} loading={uploading} error={uploadError} />
              </motion.div>
            </motion.div>

          ) : (
            /* ── Dashboard ── */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-6xl mx-auto px-4 py-6 space-y-4"
            >
              {/* File bar */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass flex items-center justify-between px-5 py-3 relative overflow-hidden flex-wrap gap-3"
              >
                <div className="absolute inset-x-0 top-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
                  aria-hidden="true" />
                <div className="flex items-center gap-3 flex-wrap">
                  <motion.div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.3, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity }} aria-hidden="true" />
                  <span className="text-xs font-mono text-white/60">
                    {file?.name ?? restoredFilename ?? 'Unknown file'}
                  </span>
                  <span className="text-[11px] font-mono text-white/25 border-l border-white/10 pl-3">
                    {data.shape[0].toLocaleString()} rows · {data.columns.length} cols
                  </span>
                  {restoredFilename && !file && (
                    <span className="text-[10px] font-mono text-white/20 border border-white/[0.06] px-2 py-0.5">
                      session restored · re-upload to run new analyses
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <ColumnRenamer columns={data.columns} renameMap={renameMap} onChange={setRenameMap} />
                  <motion.button
                    onClick={reset}
                    whileHover={{ color: 'rgba(255,255,255,0.9)' }}
                    className="text-xs font-mono text-white/25 transition-colors"
                    aria-label="Close analysis and upload new file"
                  >
                    ✕ Close
                  </motion.button>
                </div>
              </motion.div>

              {/* Smart alert banners */}
              <AlertBanner data={data} />

              {/* Tabs — horizontally scrollable on mobile */}
              <div className="overflow-x-auto -mx-4 px-4 sm:overflow-visible sm:mx-0 sm:px-0">
                <Tabs tabs={TABS} active={tab} onChange={(t) => setTab(t as Tab)} />
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  {tab === 'overview' && <Overview data={data} renameMap={renameMap} />}
                  {tab === 'trends'   && <Trends   data={data} />}
                  {tab === 'kpi'      && (
                    <KPIAnalysis data={data} kpiResult={analysis.kpiResult}
                      loading={analysis.kpiLoading} error={analysis.kpiError} onRun={analysis.runKpi} />
                  )}
                  {tab === 'distributions' && <Distributions data={data} />}
                  {tab === 'correlations'  && (
                    <Correlations correlations={analysis.corrResult} loading={analysis.corrLoading}
                      corrError={analysis.corrError} onLoad={analysis.loadCorrelations} uploadData={data} />
                  )}
                  {tab === 'forecast' && (
                    <Forecast data={data} forecastResult={analysis.forecastResult}
                      loading={analysis.forecastLoading} error={analysis.forecastError} onRun={analysis.runForecast} />
                  )}
                  {tab === 'segments' && (
                    <Segments data={data} segmentResult={analysis.segmentResult}
                      loading={analysis.segmentLoading} error={analysis.segmentError} onRun={analysis.runSegment} />
                  )}
                  {tab === 'model' && (
                    <MLModel uploadData={data} onTrain={analysis.runTrain}
                      result={analysis.trainResult} loading={analysis.trainLoading} error={analysis.trainError} />
                  )}
                  {tab === 'story' && <Story data={data} corrResult={analysis.corrResult} />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
    </RenameContext.Provider>
  )
}
