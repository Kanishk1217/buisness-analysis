import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { UploadResponse } from '../../types'

const TOOLTIP = {
  contentStyle: { background: '#111', border: '1px solid #262626', borderRadius: 0, fontSize: 11 },
  labelStyle:   { color: '#a1a1aa' },
  itemStyle:    { color: '#fafafa' },
}

export function Distributions({ data }: { data: UploadResponse }) {
  const [selected, setSelected] = useState<string[]>(data.numeric_cols.slice(0, 3))

  const buildHistogram = (col: string) => {
    const vals = data.sample
      .map((r) => Number(r[col]))
      .filter((v) => !isNaN(v))
    if (!vals.length) return []
    const mn = Math.min(...vals)
    const mx = Math.max(...vals)
    const bins = 10
    const size = (mx - mn) / bins || 1
    const counts = Array(bins).fill(0)
    vals.forEach((v) => { counts[Math.min(Math.floor((v - mn) / size), bins - 1)]++ })
    return counts.map((count, i) => ({
      range: `${(mn + i * size).toFixed(1)}`,
      count,
    }))
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {data.numeric_cols.map((col) => (
          <button
            key={col}
            onClick={() =>
              setSelected((prev) =>
                prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
              )
            }
            className={`px-3 py-1 text-xs font-mono border transition-colors
              ${selected.includes(col)
                ? 'border-primary text-primary'
                : 'border-border text-dim hover:border-dim'}`}
          >
            {col}
          </button>
        ))}
      </div>

      {selected.map((col) => (
        <div key={col} className="bg-surface border border-border p-4">
          <p className="text-xs font-mono text-dim uppercase tracking-widest mb-4">{col}</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={buildHistogram(col)} barCategoryGap="4%">
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} />
              <Tooltip {...TOOLTIP} />
              <Bar dataKey="count" fill="#fafafa" fillOpacity={0.7} radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </motion.div>
  )
}
