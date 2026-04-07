/** Format a number as compact (1.2M, 34.5K) or with decimal places */
export function fmt(n: number | null | undefined, opts?: { pct?: boolean; dec?: number }): string {
  if (n === null || n === undefined) return '—'
  if (opts?.pct) return `${n.toFixed(opts.dec ?? 1)}%`
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(opts?.dec ?? 1)}B`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(opts?.dec ?? 1)}M`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(opts?.dec ?? 1)}K`
  return n.toLocaleString(undefined, { maximumFractionDigits: opts?.dec ?? 2 })
}

/** Compact Y-axis tick formatter for Recharts */
export function fmtAxis(n: number): string {
  return fmt(n, { dec: 1 })
}

/** Growth sign prefix */
export function fmtGrowth(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}
