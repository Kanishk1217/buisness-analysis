interface Props {
  label:    string
  variant?: 'default' | 'up' | 'down' | 'flat'
}

export function Badge({ label, variant = 'default' }: Props) {
  const variants = {
    default: 'bg-surface2 text-muted border-border',
    up:      'bg-surface2 text-primary border-border',
    down:    'bg-surface2 text-muted border-border',
    flat:    'bg-surface2 text-dim border-border',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-mono border ${variants[variant]}`}>
      {label}
    </span>
  )
}
