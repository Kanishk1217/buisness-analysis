import { useRef } from 'react'
import { motion, useMotionValue, useSpring, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

type Props = Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children?: ReactNode
  magnetic?: boolean
}

export function Button({
  variant = 'primary', size = 'md', className = '',
  children, disabled, magnetic = false, ...props
}: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 300, damping: 25 })
  const springY = useSpring(y, { stiffness: 300, damping: 25 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!magnetic || disabled || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left - rect.width  / 2) * 0.25)
    y.set((e.clientY - rect.top  - rect.height / 2) * 0.25)
  }
  const handleMouseLeave = () => { x.set(0); y.set(0) }

  const base = 'relative inline-flex items-center justify-center font-medium tracking-wide transition-colors focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden select-none'

  const variants = {
    primary: 'bg-white text-black hover:bg-white/90',
    ghost:   'text-white/60 hover:text-white hover:bg-white/[0.06]',
    outline: 'border border-white/10 text-white/70 hover:border-white/25 hover:text-white hover:bg-white/[0.04]',
  }
  const sizes = {
    sm: 'px-4 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-sm gap-2',
  }

  return (
    <motion.button
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={disabled ? {} : { scale: magnetic ? 1 : 1.02 }}
      whileTap={disabled ? {} : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {variant === 'primary' && !disabled && (
        <motion.span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      )}
      {variant === 'outline' && (
        <motion.span
          className="absolute inset-0 rounded-inherit"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  )
}
