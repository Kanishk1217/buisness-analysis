interface Props {
  value: number | null | undefined
  type: 'r2' | 'health' | 'confidence' | 'accuracy'
}

interface Level { label: string; color: string; bar: string }

function getLevel(type: Props['type'], value: number): Level {
  if (type === 'r2' || type === 'accuracy') {
    if (value >= 0.85) return { label: 'Excellent',  color: 'text-white/90', bar: 'bg-white/80' }
    if (value >= 0.65) return { label: 'Good',       color: 'text-white/60', bar: 'bg-white/50' }
    if (value >= 0.45) return { label: 'Moderate',   color: 'text-white/40', bar: 'bg-white/30' }
    return              { label: 'Weak — re-train',  color: 'text-white/25', bar: 'bg-white/15' }
  }
  if (type === 'health') {
    if (value >= 90) return { label: 'Excellent quality', color: 'text-white/90', bar: 'bg-white/80' }
    if (value >= 70) return { label: 'Good quality',      color: 'text-white/60', bar: 'bg-white/50' }
    if (value >= 50) return { label: 'Fair quality',      color: 'text-white/40', bar: 'bg-white/30' }
    return            { label: 'Poor — clean data first', color: 'text-white/25', bar: 'bg-white/15' }
  }
  // confidence
  if (value >= 0.8) return { label: 'High confidence',   color: 'text-white/80', bar: 'bg-white/70' }
  if (value >= 0.5) return { label: 'Medium confidence', color: 'text-white/50', bar: 'bg-white/40' }
  return             { label: 'Low — gather more data',  color: 'text-white/30', bar: 'bg-white/20' }
}

export function TrustBadge({ value, type }: Props) {
  if (value === null || value === undefined) return null
  const normalised = type === 'health' ? value / 100 : value
  const pct  = Math.round(Math.max(0, Math.min(1, normalised)) * 100)
  const lvl  = getLevel(type, type === 'health' ? value : normalised)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono text-white/30">
        <span>Model Reliability</span>
        <span className={lvl.color}>{lvl.label}</span>
      </div>
      <div className="h-1 bg-white/[0.06] overflow-hidden">
        <div className={`h-full transition-all duration-700 ${lvl.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
