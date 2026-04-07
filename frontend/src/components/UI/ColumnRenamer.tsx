import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  columns:   string[]
  renameMap: Record<string, string>
  onChange:  (map: Record<string, string>) => void
}

export function ColumnRenamer({ columns, renameMap, onChange }: Props) {
  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState<Record<string, string>>({})

  const open_ = () => {
    const init: Record<string, string> = {}
    columns.forEach((c) => { init[c] = renameMap[c] ?? c })
    setEditing(init)
    setOpen(true)
  }

  const save = () => {
    const next: Record<string, string> = {}
    columns.forEach((c) => {
      const val = editing[c]?.trim()
      if (val && val !== c) next[c] = val
    })
    onChange(next)
    setOpen(false)
  }

  const reset = () => { onChange({}); setOpen(false) }

  return (
    <>
      <button
        onClick={open_}
        aria-label="Rename columns"
        className="text-[11px] font-mono text-white/25 hover:text-white/50 transition-colors border border-white/[0.06] px-3 py-1"
      >
        Rename Columns
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-black border border-white/10 w-full max-w-lg max-h-[80vh] flex flex-col"
            >
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                <p className="text-xs font-mono text-white/50 uppercase tracking-widest">Rename Columns</p>
                <button onClick={() => setOpen(false)} aria-label="Close" className="text-white/25 hover:text-white/60 font-mono text-xs">✕</button>
              </div>
              <div className="overflow-y-auto flex-1 p-5 space-y-2">
                {columns.map((col) => (
                  <div key={col} className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-white/30 w-32 truncate flex-shrink-0">{col}</span>
                    <span className="text-white/20 text-xs">→</span>
                    <input
                      value={editing[col] ?? col}
                      onChange={(e) => setEditing((p) => ({ ...p, [col]: e.target.value }))}
                      aria-label={`Rename ${col}`}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] text-white/70 text-xs font-mono px-3 py-1.5 focus:outline-none focus:border-white/20"
                    />
                  </div>
                ))}
              </div>
              <div className="p-5 border-t border-white/[0.06] flex justify-between gap-3">
                <button onClick={reset} className="text-xs font-mono text-white/25 hover:text-white/50 transition-colors">Reset all</button>
                <div className="flex gap-3">
                  <button onClick={() => setOpen(false)} className="text-xs font-mono text-white/30 hover:text-white/60 border border-white/10 px-4 py-1.5">Cancel</button>
                  <button onClick={save} className="text-xs font-mono text-white/80 hover:text-white border border-white/20 px-4 py-1.5 bg-white/[0.04]">Save</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
