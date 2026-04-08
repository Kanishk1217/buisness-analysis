import { motion, useScroll, useTransform } from 'framer-motion'

interface Props { onReset: () => void }

export function Navbar({ onReset }: Props) {
  const { scrollY } = useScroll()
  const bg = useTransform(scrollY, [0, 60], ['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)'])

  return (
    <motion.header
      style={{ backgroundColor: bg }}
      className="fixed top-0 inset-x-0 z-50 h-14 flex items-center px-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="absolute inset-0 border-b border-white/[0.06]"
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      />

      <div className="relative flex w-full items-center">
        {/* Logo — click to reset */}
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 cursor-pointer focus:outline-none group"
          aria-label="Go back to upload screen"
        >
          <div className="relative w-6 h-6 overflow-hidden">
            <div className="grid grid-cols-2 gap-0.5 w-full h-full">
              {[1, 0.35, 0.35, 1].map((op, i) => (
                <div key={i} className="bg-white rounded-[1px] transition-opacity group-hover:opacity-100" style={{ opacity: op }} />
              ))}
            </div>
          </div>
          <span className="text-sm font-medium tracking-tight text-white/90 group-hover:text-white transition-colors">
            Business Analyzer
          </span>
        </button>

        {/* Right */}
        <div className="ml-auto flex items-center gap-6">
          <motion.div
            className="flex items-center gap-1.5"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-1 h-1 rounded-full bg-white/40" />
            <span className="text-[11px] font-mono text-white/40 tracking-widest">v1.0</span>
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}
