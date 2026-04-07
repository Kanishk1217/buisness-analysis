import { motion } from 'framer-motion'

interface Props {
  insights: string[]
  title?: string
}

export function InsightPanel({ insights, title = 'Key Insights' }: Props) {
  if (!insights || insights.length === 0) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass p-4 space-y-2"
    >
      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-3">{title}</p>
      <ul className="space-y-2">
        {insights.map((text, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-2.5 text-xs font-mono text-white/60 leading-relaxed"
          >
            <span className="text-white/20 mt-0.5 flex-shrink-0">›</span>
            <span>{text}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  )
}
