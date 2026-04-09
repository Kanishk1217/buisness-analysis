import { useState, useEffect, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navbar }          from './components/Layout/Navbar'
import { Footer }          from './components/Layout/Footer'
import { DropZone }        from './components/Upload/DropZone'
import { CompactUpload }   from './components/Upload/CompactUpload'
import { UploadingScreen } from './components/Upload/UploadingScreen'
import { Tabs }            from './components/UI/Tabs'
import { SlotContent }     from './components/Dashboard/SlotContent'
import { useUpload }       from './hooks/useUpload'
import { useAnalysis }     from './hooks/useAnalysis'
import { uploadCSV }       from './api/client'
import { pingServer }      from './api/client'
import type { Tab, UploadResponse } from './types'

// ── Rename context (per-slot, provided by SlotContent) ──────────
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

type Layout = 'sidebyside' | 'switch'

export default function App() {
  /* ── Primary slot (session-persisted) ── */
  const { file: f0, data: d0, loading: l0, error: e0, upload: up0, reset: reset0, restoredFilename } = useUpload()

  /* ── Comparison slots (ephemeral) ── */
  const [f1, setF1] = useState<File | null>(null)
  const [d1, setD1] = useState<UploadResponse | null>(null)
  const [l1, setL1] = useState(false)
  const [e1, setE1] = useState<string | null>(null)

  const [f2, setF2] = useState<File | null>(null)
  const [d2, setD2] = useState<UploadResponse | null>(null)
  const [l2, setL2] = useState(false)
  const [e2, setE2] = useState<string | null>(null)

  /* ── Analysis hooks — always called unconditionally ── */
  const a0 = useAnalysis(f0)
  const a1 = useAnalysis(f1)
  const a2 = useAnalysis(f2)

  /* ── UI state ── */
  const [tab,          setTab]          = useState<Tab>('overview')
  const [layout,       setLayout]       = useState<Layout>('sidebyside')
  const [activeSlot,   setActiveSlot]   = useState(0)
  const [serverReady,  setReady]        = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)

  useEffect(() => { pingServer().finally(() => setReady(true)) }, [])

  /* ── Upload helpers for comparison slots ── */
  async function uploadSlot(idx: 1 | 2, f: File) {
    const setL = idx === 1 ? setL1 : setL2
    const setE = idx === 1 ? setE1 : setE2
    const setF = idx === 1 ? setF1 : setF2
    const setD = idx === 1 ? setD1 : setD2
    if (f.size > 20 * 1024 * 1024) { setE('File too large (max 20 MB).'); return }
    setL(true); setE(null)
    try {
      const res = await uploadCSV(f)
      setF(f); setD(res)
      setShowAddPanel(false)
    } catch (err: unknown) {
      setE(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setL(false)
    }
  }

  function removeSlot(idx: 1 | 2) {
    if (idx === 1) { setF1(null); setD1(null); setE1(null) }
    else           { setF2(null); setD2(null); setE2(null) }
    if (activeSlot === idx) setActiveSlot(0)
  }

  function resetAll() {
    reset0()
    setF1(null); setD1(null); setE1(null)
    setF2(null); setD2(null); setE2(null)
    setActiveSlot(0); setShowAddPanel(false)
  }

  /* ── Active slots ── */
  const loadedSlots = [
    d0 ? { data: d0, file: f0, analysis: a0, name: f0?.name ?? restoredFilename ?? 'File 1', idx: 0 as const } : null,
    d1 ? { data: d1, file: f1, analysis: a1, name: f1?.name ?? 'File 2',                     idx: 1 as const } : null,
    d2 ? { data: d2, file: f2, analysis: a2, name: f2?.name ?? 'File 3',                     idx: 2 as const } : null,
  ].filter(Boolean) as { data: UploadResponse; file: File | null; analysis: ReturnType<typeof useAnalysis>; name: string; idx: number }[]

  const compareActive = loadedSlots.length > 1
  const canAddMore    = d0 !== null && loadedSlots.length < 3

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col">
      <div className="bg-orb bg-orb-1" aria-hidden="true" />
      <div className="bg-orb bg-orb-2" aria-hidden="true" />
      <div className="bg-orb bg-orb-3" aria-hidden="true" />
      <div className="noise"           aria-hidden="true" />

      <Navbar onReset={resetAll} />

      <AnimatePresence>
        {l0 && f0 && <UploadingScreen filename={f0.name} />}
      </AnimatePresence>

      <main id="main-content" className="relative z-10 flex-1 pt-14">
        <AnimatePresence mode="wait">
          {!d0 ? (
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
                No data science knowledge required · Compare up to 3 files · Free
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                className="flex flex-wrap justify-center gap-2 mb-12"
              >
                {['Revenue Trends', 'Profit Forecasting', 'Customer Segments', 'Risk Detection', 'ML Predictions', 'Multi-file Compare'].map((f, i) => (
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
                    <div className="flex items-center gap-2.5 text-[11px] font-mono text-white/25 glass px-4 py-2.5" role="status" aria-live="polite">
                      <motion.div className="w-1 h-1 rounded-full bg-white/40"
                        animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity }} aria-hidden="true" />
                      Waking up server — first load may take ~30s
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-xl"
              >
                <DropZone onFile={up0} loading={l0} error={e0} />
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
                className="glass flex items-center justify-between px-5 py-3 relative overflow-hidden flex-wrap gap-3"
              >
                <div className="absolute inset-x-0 top-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
                  aria-hidden="true" />

                {/* File names */}
                <div className="flex items-center gap-2 flex-wrap">
                  {loadedSlots.map((slot) => (
                    <span key={slot.idx} className="text-xs font-mono text-white/50 border border-white/[0.08] px-2 py-0.5">
                      {slot.name}
                    </span>
                  ))}
                  {restoredFilename && !f0 && (
                    <span className="text-[10px] font-mono text-white/20 border border-white/[0.06] px-2 py-0.5">
                      session restored · re-upload to run new analyses
                    </span>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Layout toggle */}
                  {compareActive && (
                    <div className="flex items-center border border-white/[0.08]">
                      <button
                        onClick={() => setLayout('sidebyside')}
                        className={`px-2.5 py-1 text-[10px] font-mono transition-colors ${layout === 'sidebyside' ? 'bg-white/10 text-white/80' : 'text-white/30 hover:text-white/50'}`}
                        aria-pressed={layout === 'sidebyside'}
                      >Side by Side</button>
                      <div className="w-px h-4 bg-white/[0.08]" />
                      <button
                        onClick={() => setLayout('switch')}
                        className={`px-2.5 py-1 text-[10px] font-mono transition-colors ${layout === 'switch' ? 'bg-white/10 text-white/80' : 'text-white/30 hover:text-white/50'}`}
                        aria-pressed={layout === 'switch'}
                      >Switch Files</button>
                    </div>
                  )}

                  {/* Add file */}
                  {canAddMore && (
                    <button
                      onClick={() => setShowAddPanel((p) => !p)}
                      className="text-[10px] font-mono text-white/30 hover:text-white/60 border border-white/[0.08] px-2.5 py-1 transition-colors"
                      aria-expanded={showAddPanel}
                    >
                      {showAddPanel ? '− Hide' : '+ Compare Files'}
                    </button>
                  )}

                  <motion.button onClick={resetAll} whileHover={{ color: 'rgba(255,255,255,0.9)' }}
                    className="text-xs font-mono text-white/25 transition-colors" aria-label="Reset all files">
                    ✕ Close
                  </motion.button>
                </div>
              </motion.div>

              {/* ── Add files panel ── */}
              <AnimatePresence>
                {showAddPanel && canAddMore && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-surface border border-border p-4 space-y-3">
                      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">
                        Add Files to Compare (up to 3 total)
                      </p>
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                        {!d1 && (
                          <CompactUpload label="File 2 — drop CSV here"
                            onFile={(f) => uploadSlot(1, f)}
                            loading={l1} error={e1} />
                        )}
                        {d1 && !d2 && (
                          <CompactUpload label="File 3 — drop CSV here"
                            onFile={(f) => uploadSlot(2, f)}
                            loading={l2} error={e2} />
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-white/20">
                        All tabs work independently per file. Side-by-side shows the same tab for all files at once.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Switch mode: file selector ── */}
              {compareActive && layout === 'switch' && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {loadedSlots.map((slot, i) => (
                    <button
                      key={slot.idx}
                      onClick={() => setActiveSlot(i)}
                      className={`flex-shrink-0 px-3 py-1.5 text-xs font-mono border transition-colors ${
                        activeSlot === i
                          ? 'border-white/40 text-white bg-white/[0.06]'
                          : 'border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/20'
                      }`}
                    >
                      {slot.name}
                      {slot.idx !== 0 && (
                        <span
                          className="ml-2 text-white/20 hover:text-white/60 transition-colors"
                          onClick={(e) => { e.stopPropagation(); removeSlot(slot.idx as 1 | 2) }}
                          role="button"
                          aria-label={`Remove ${slot.name}`}
                        >✕</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Shared tab bar ── */}
              <div className="overflow-x-auto -mx-4 px-4 sm:overflow-visible sm:mx-0 sm:px-0">
                <Tabs tabs={TABS} active={tab} onChange={(t) => setTab(t as Tab)} />
              </div>

              {/* ── Content ── */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${tab}-${layout}-${activeSlot}`}
                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Side-by-side */}
                  {(!compareActive || layout === 'sidebyside') && (
                    <div className={`grid gap-6 ${
                      loadedSlots.length === 1 ? 'grid-cols-1' :
                      loadedSlots.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                      'grid-cols-1 lg:grid-cols-3'
                    }`}>
                      {loadedSlots.map((slot) => (
                        <SlotContent
                          key={slot.idx}
                          data={slot.data}
                          file={slot.file}
                          analysis={slot.analysis}
                          tab={tab}
                          filename={slot.name}
                          compact={loadedSlots.length > 1}
                          onRemove={slot.idx !== 0 ? () => removeSlot(slot.idx as 1 | 2) : undefined}
                        />
                      ))}

                      {/* Add-more placeholder in side-by-side */}
                      {loadedSlots.length < 3 && !showAddPanel && loadedSlots.length > 1 && (
                        <button
                          onClick={() => setShowAddPanel(true)}
                          className="border border-dashed border-white/[0.08] flex flex-col items-center justify-center gap-2 p-12 text-white/20 hover:text-white/40 hover:border-white/20 transition-colors min-h-[200px]"
                        >
                          <span className="text-2xl">+</span>
                          <span className="text-xs font-mono">Add File {loadedSlots.length + 1}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Switch mode */}
                  {compareActive && layout === 'switch' && (
                    <SlotContent
                      data={loadedSlots[activeSlot]?.data ?? d0!}
                      file={loadedSlots[activeSlot]?.file ?? f0}
                      analysis={loadedSlots[activeSlot]?.analysis ?? a0}
                      tab={tab}
                      filename={loadedSlots[activeSlot]?.name ?? ''}
                      compact={false}
                      onRemove={loadedSlots[activeSlot]?.idx !== 0
                        ? () => removeSlot(loadedSlots[activeSlot].idx as 1 | 2)
                        : undefined
                      }
                    />
                  )}
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
