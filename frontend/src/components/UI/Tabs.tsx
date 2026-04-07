import { motion } from 'framer-motion'
import type { Tab } from '../../types'

interface Props {
  tabs?:    { id: Tab; label: string }[]
  active:   Tab
  onChange: (t: Tab) => void
}

export function Tabs({ tabs = [], active, onChange }: Props) {
  return (
    <div className="relative flex flex-wrap gap-0 border-b border-white/[0.06]">
      {tabs.map(({ id, label }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="relative px-5 py-3 text-xs font-medium tracking-wide transition-colors duration-200 focus:outline-none"
            style={{ color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)' }}
          >
            {isActive && (
              <>
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-px bg-white"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              </>
            )}
            <span className="relative z-10">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
