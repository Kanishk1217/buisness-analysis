import { motion } from 'framer-motion'

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className="border-t border-border/50 mt-24 py-6"
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <p className="text-xs text-dim font-mono">Business Analyzer</p>
        <div className="flex items-center gap-4">
          {['FastAPI', 'React', 'TypeScript', 'Recharts'].map((t) => (
            <span key={t} className="text-[11px] text-dim/60 font-mono">{t}</span>
          ))}
        </div>
      </div>
    </motion.footer>
  )
}
