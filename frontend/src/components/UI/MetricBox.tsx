import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

interface Props {
  label:  string
  value:  string | number
  sub?:   string
  delay?: number
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    const start = performance.now()
    const duration = 900
    const tick = (now: number) => {
      const t      = Math.min((now - start) / duration, 1)
      const eased  = 1 - Math.pow(1 - t, 4)
      setDisplay(Math.round(value * eased))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value])
  return <>{display.toLocaleString()}</>
}

export function MetricBox({ label, value, sub, delay = 0 }: Props) {
  const ref    = useRef<HTMLDivElement>(null)
  const rotateX = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 })
  const glowX   = useMotionValue(50)
  const glowY   = useMotionValue(50)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top)  / rect.height
    rotateY.set((px - 0.5) * 12)
    rotateX.set(-(py - 0.5) * 12)
    glowX.set(px * 100)
    glowY.set(py * 100)
  }
  const handleMouseLeave = () => { rotateX.set(0); rotateY.set(0) }

  const isNum = typeof value === 'number'

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 800 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="glass glass-hover glow-border-hover relative overflow-hidden p-5 cursor-default"
    >
      <motion.div
        className="absolute w-32 h-32 rounded-full pointer-events-none"
        style={{
          left: glowX,
          top:  glowY,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
        }}
      />
      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-2">{label}</p>
      <p className="text-2xl font-semibold text-white leading-none">
        {isNum ? <AnimatedNumber value={value} /> : value}
      </p>
      {sub && <p className="text-xs text-white/30 mt-2 font-mono">{sub}</p>}
    </motion.div>
  )
}
