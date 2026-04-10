import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  UploadResponse, CorrelationResponse, KpiResponse,
  ForecastResponse, SegmentResponse, TrainResponse, InsightsResponse,
} from '../../types'
import { fmt, fmtGrowth } from '../../utils/format'

// ── Theme palettes ────────────────────────────────────────────────────────────
const DARK = {
  bg:    [10,  10,  14]  as [number,number,number],
  card:  [20,  20,  28]  as [number,number,number],
  card2: [30,  30,  42]  as [number,number,number],
  line:  [44,  46,  64]  as [number,number,number],
  muted: [88,  90,  118] as [number,number,number],
  body:  [175, 178, 208] as [number,number,number],
  head:  [230, 232, 255] as [number,number,number],
  acc:   [139, 92,  246] as [number,number,number],   // violet-500
  acc2:  [59,  130, 246] as [number,number,number],   // blue-500
  ok:    [52,  211, 153] as [number,number,number],
  warn:  [251, 191, 36]  as [number,number,number],
  bad:   [251, 113, 133] as [number,number,number],
  isDark: true,
}

const LIGHT = {
  bg:    [250, 251, 255] as [number,number,number],
  card:  [235, 238, 252] as [number,number,number],
  card2: [220, 225, 246] as [number,number,number],
  line:  [192, 198, 228] as [number,number,number],
  muted: [118, 124, 162] as [number,number,number],
  body:  [42,  48,  84]  as [number,number,number],
  head:  [10,  14,  44]  as [number,number,number],
  acc:   [109, 40,  217] as [number,number,number],   // violet-700
  acc2:  [29,  78,  216] as [number,number,number],   // blue-700
  ok:    [4,   136, 96]  as [number,number,number],
  warn:  [146, 100, 0]   as [number,number,number],
  bad:   [190, 28,  28]  as [number,number,number],
  isDark: false,
}

type Theme = typeof DARK

const PW = 210, PH = 297, M = 16, CW = PW - M * 2

let _y   = 0
let _doc: jsPDF
let T: Theme = DARK

// ── Page helpers ──────────────────────────────────────────────────────────────
function bgFill() {
  _doc.setFillColor(...T.bg)
  _doc.rect(0, 0, PW, PH, 'F')
}

function newPage() {
  _doc.addPage()
  bgFill()
  _y = 20
}

function chk(needed: number) {
  if (_y + needed > PH - 20) newPage()
}

// ── Layout primitives ─────────────────────────────────────────────────────────

function secHeader(title: string, sub?: string) {
  chk(sub ? 24 : 18)

  // Numbered badge: extract leading number if present
  const match = title.match(/^(\d+)/)
  const secNum = match ? match[1] : ''
  const titleText = match ? title.replace(/^\d+\s*[-\u2014]?\s*/, '').trim() : title

  if (secNum) {
    _doc.setFillColor(...T.acc)
    _doc.roundedRect(M, _y, 10, 7, 1, 1, 'F')
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(7)
    _doc.setTextColor(T.isDark ? 10 : 255, T.isDark ? 10 : 255, T.isDark ? 14 : 255)
    _doc.text(secNum, M + 5, _y + 4.8, { align: 'center' })

    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(10)
    _doc.setTextColor(...T.head)
    _doc.text(titleText, M + 13, _y + 5)
  } else {
    // Sub-section header (no badge)
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(9)
    _doc.setTextColor(...T.acc)
    _doc.text(titleText, M, _y + 5)
  }

  if (sub) {
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(7)
    _doc.setTextColor(...T.muted)
    _doc.text(sub, secNum ? M + 13 : M, _y + 10.5)
  }

  _y += sub ? 15 : 11
  _doc.setFillColor(...T.line)
  _doc.rect(M, _y, CW, 0.3, 'F')
  _y += 5
}

function bul(text: string) {
  const lines = _doc.splitTextToSize(text, CW - 5) as string[]
  chk(lines.length * 5 + 3)
  _doc.setFillColor(...T.acc)
  _doc.circle(M + 1.2, _y + 1.2, 0.9, 'F')
  _doc.setFont('helvetica', 'normal')
  _doc.setFontSize(8.5)
  _doc.setTextColor(...T.body)
  _doc.text(lines, M + 5, _y + 2.5)
  _y += lines.length * 4.8 + 2
}

function statRow(items: { label: string; value: string; color?: [number,number,number] }[]) {
  chk(22)
  const cw = CW / items.length

  if (T.isDark) {
    _doc.setFillColor(...T.card)
    _doc.roundedRect(M, _y, CW, 16, 1, 1, 'F')
  } else {
    _doc.setFillColor(255, 255, 255)
    _doc.roundedRect(M, _y, CW, 16, 1, 1, 'F')
    _doc.setDrawColor(...T.line)
    _doc.setLineWidth(0.3)
    _doc.roundedRect(M, _y, CW, 16, 1, 1, 'S')
  }

  items.forEach(({ label, value, color }, i) => {
    const x = M + i * cw + cw / 2
    if (i > 0) {
      _doc.setFillColor(...T.line)
      _doc.rect(M + i * cw, _y + 3, 0.25, 10, 'F')
    }
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(7)
    _doc.setTextColor(...T.muted)
    _doc.text(label.toUpperCase(), x, _y + 5, { align: 'center' })
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(10)
    _doc.setTextColor(...(color ?? T.acc))
    _doc.text(value, x, _y + 12.5, { align: 'center' })
  })
  _y += 22
}

function tbl(
  heads: string[],
  rows: string[][],
  cs?: Record<number, { halign?: 'left' | 'right' | 'center' }>
) {
  if (!rows.length) return
  chk(20)

  const altRow: [number,number,number] = T.isDark
    ? [T.bg[0], T.bg[1], T.bg[2]]
    : [T.card2[0], T.card2[1], T.card2[2]]

  autoTable(_doc, {
    startY: _y,
    head:   [heads],
    body:   rows,
    theme:  'plain',
    styles: {
      font:        'helvetica',
      fontSize:    7.5,
      textColor:   [T.body[0],  T.body[1],  T.body[2]],
      fillColor:   [T.card[0],  T.card[1],  T.card[2]],
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      lineColor:   [T.line[0],  T.line[1],  T.line[2]],
      lineWidth:   0.2,
    },
    headStyles: {
      fillColor:  [T.card2[0], T.card2[1], T.card2[2]],
      textColor:  [T.acc[0],   T.acc[1],   T.acc[2]],
      fontSize:   6.5,
      fontStyle:  'bold',
    },
    alternateRowStyles: { fillColor: altRow },
    margin: { left: M, right: M },
    columnStyles: cs ?? {},
    willDrawPage: (data) => {
      if (data.pageNumber > 1) {
        _doc.setFillColor(...T.bg)
        _doc.rect(0, 0, PW, PH, 'F')
      }
    },
  })
  _y = (_doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
}

// Feature importance table with inline bar
function fiTbl(
  heads: string[],
  rows: string[][],
  maxScore: number
) {
  if (!rows.length) return
  chk(20)

  const altRow: [number,number,number] = T.isDark
    ? [T.bg[0], T.bg[1], T.bg[2]]
    : [T.card2[0], T.card2[1], T.card2[2]]

  autoTable(_doc, {
    startY: _y,
    head:   [heads],
    body:   rows,
    theme:  'plain',
    styles: {
      font:        'helvetica',
      fontSize:    7,
      textColor:   [T.body[0],  T.body[1],  T.body[2]],
      fillColor:   [T.card[0],  T.card[1],  T.card[2]],
      cellPadding: { top: 2, bottom: 2, left: 4, right: 4 },
      lineColor:   [T.line[0],  T.line[1],  T.line[2]],
      lineWidth:   0.2,
    },
    headStyles: {
      fillColor:  [T.card2[0], T.card2[1], T.card2[2]],
      textColor:  [T.acc[0],   T.acc[1],   T.acc[2]],
      fontSize:   6.5,
      fontStyle:  'bold',
    },
    alternateRowStyles: { fillColor: altRow },
    columnStyles: { 4: { cellWidth: 28 } },
    margin: { left: M, right: M },
    willDrawPage: (data) => {
      if (data.pageNumber > 1) {
        _doc.setFillColor(...T.bg)
        _doc.rect(0, 0, PW, PH, 'F')
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const score = Number(data.cell.raw)
        const maxW  = data.cell.width - 4
        const barW  = maxW * Math.min(score / maxScore, 1)
        _doc.setFillColor(...T.acc)
        _doc.rect(data.cell.x + 2, data.cell.y + data.cell.height - 3, barW, 2, 'F')
      }
    },
  })
  _y = (_doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
}

// ── Cover page ─────────────────────────────────────────────────────────────────
function cover(filename: string, data: UploadResponse) {
  bgFill()

  const sf      = filename.length > 55 ? filename.substring(0, 52) + '...' : filename
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const comp    = (100 - (data.missing_total / Math.max(data.shape[0] * data.shape[1], 1)) * 100).toFixed(1)

  if (T.isDark) {
    // ── DARK cover ─────────────────────────────────────────────────────────────
    // Left accent strip
    _doc.setFillColor(...T.acc)
    _doc.rect(0, 0, 5, PH, 'F')

    // Decorative arcs top-right
    for (let i = 0; i < 4; i++) {
      const r = 45 + i * 22
      _doc.setDrawColor(T.acc2[0], T.acc2[1], T.acc2[2])
      _doc.setLineWidth(0.25 + i * 0.1)
      _doc.circle(PW + 5, -5, r, 'S')
    }

    // Title
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(7)
    _doc.setTextColor(...T.acc2)
    _doc.text('BUSINESS ANALYZER  -  AI-POWERED INTELLIGENCE', M + 5, 38)

    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(36)
    _doc.setTextColor(...T.head)
    _doc.text('Business', M + 5, 66)
    _doc.text('Analysis', M + 5, 82)

    _doc.setFillColor(...T.acc)
    _doc.rect(M + 5, 87, 40, 1.2, 'F')
    _doc.setFillColor(...T.acc2)
    _doc.rect(M + 47, 87, 20, 1.2, 'F')

    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(10)
    _doc.setTextColor(...T.body)
    _doc.text('Report', M + 5, 97)

    _doc.setFillColor(...T.line)
    _doc.rect(M + 5, 110, CW - 5, 0.3, 'F')

    _doc.setFontSize(7)
    _doc.setTextColor(...T.muted)
    _doc.text('FILE', M + 5, 120)
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(9)
    _doc.setTextColor(...T.head)
    _doc.text(sf, M + 5, 126)
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(7)
    _doc.setTextColor(...T.muted)
    _doc.text('GENERATED ON', M + 105, 120)
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(9)
    _doc.setTextColor(...T.head)
    _doc.text(dateStr, M + 105, 126)

    // Stat cards
    const sy = 140
    const sw  = CW / 4
    _doc.setFillColor(...T.card)
    _doc.roundedRect(M, sy, CW, 22, 2, 2, 'F')

    const stats = [
      { label: 'ROWS',         value: data.shape[0].toLocaleString() },
      { label: 'COLUMNS',      value: data.shape[1].toString() },
      { label: 'QUALITY',      value: `${data.health_score}%` },
      { label: 'COMPLETENESS', value: `${comp}%` },
    ]
    stats.forEach(({ label, value }, i) => {
      const x = M + i * sw + sw / 2
      if (i > 0) {
        _doc.setFillColor(...T.line)
        _doc.rect(M + i * sw, sy + 5, 0.3, 12, 'F')
      }
      _doc.setFont('helvetica', 'normal')
      _doc.setFontSize(6.5)
      _doc.setTextColor(...T.muted)
      _doc.text(label, x, sy + 8, { align: 'center' })
      _doc.setFont('helvetica', 'bold')
      _doc.setFontSize(11)
      _doc.setTextColor(...T.acc)
      _doc.text(value, x, sy + 18, { align: 'center' })
    })

    // TOC
    const tocY = 174
    _doc.setFillColor(...T.card)
    _doc.roundedRect(M, tocY, CW, 84, 2, 2, 'F')
    _doc.setFillColor(...T.acc2)
    _doc.rect(M, tocY, 3, 84, 'F')

    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(7)
    _doc.setTextColor(...T.acc)
    _doc.text('TABLE OF CONTENTS', M + 7, tocY + 8)
    _doc.setFillColor(...T.line)
    _doc.rect(M + 7, tocY + 10, CW - 10, 0.2, 'F')

    const toc = [
      'Dataset Overview & Data Quality',
      'Business Signals & Trend Analysis',
      'KPI Performance Analysis',
      'Distribution Insights',
      'Correlation Analysis',
      'Forecast Projections',
      'Customer Segments',
      'ML Model Performance',
      'Business Story & Recommendations',
    ]
    toc.forEach((item, i) => {
      _doc.setFont('helvetica', 'normal')
      _doc.setFontSize(7.5)
      _doc.setTextColor(...T.body)
      _doc.text(`${String(i + 1).padStart(2, '0')}   ${item}`, M + 7, tocY + 16 + i * 7.5)
      _doc.setTextColor(...T.muted)
      _doc.text(String(i + 2), PW - M, tocY + 16 + i * 7.5, { align: 'right' })
    })

  } else {
    // ── LIGHT cover ────────────────────────────────────────────────────────────
    // Full-width accent band at top
    const bandH = 8
    _doc.setFillColor(...T.acc)
    _doc.rect(0, 0, PW * 0.5, bandH, 'F')
    _doc.setFillColor(
      Math.round((T.acc[0] + T.acc2[0]) / 2),
      Math.round((T.acc[1] + T.acc2[1]) / 2),
      Math.round((T.acc[2] + T.acc2[2]) / 2)
    )
    _doc.rect(PW * 0.5, 0, PW * 0.25, bandH, 'F')
    _doc.setFillColor(...T.acc2)
    _doc.rect(PW * 0.75, 0, PW * 0.25, bandH, 'F')

    // Badge
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(7)
    _doc.setTextColor(...T.acc2)
    _doc.text('BUSINESS ANALYZER  -  AI-POWERED INTELLIGENCE', M, 20)

    // Title
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(36)
    _doc.setTextColor(...T.head)
    _doc.text('Business', M, 42)
    _doc.text('Analysis', M, 58)

    _doc.setFillColor(...T.acc)
    _doc.rect(M, 63, 40, 0.7, 'F')
    _doc.setFillColor(...T.acc2)
    _doc.rect(M + 42, 63, 20, 0.7, 'F')

    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(10)
    _doc.setTextColor(...T.body)
    _doc.text('Report', M, 72)

    _doc.setFillColor(...T.line)
    _doc.rect(M, 85, CW, 0.3, 'F')

    _doc.setFontSize(7)
    _doc.setTextColor(...T.muted)
    _doc.text('FILE', M, 93)
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(9)
    _doc.setTextColor(...T.head)
    _doc.text(sf, M, 99)
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(7)
    _doc.setTextColor(...T.muted)
    _doc.text('GENERATED ON', M + 105, 93)
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(9)
    _doc.setTextColor(...T.head)
    _doc.text(dateStr, M + 105, 99)

    // Stat cards
    const sy = 110
    const sw  = CW / 4

    const stats = [
      { label: 'ROWS',         value: data.shape[0].toLocaleString(),  color: T.acc },
      { label: 'COLUMNS',      value: data.shape[1].toString(),         color: T.acc },
      { label: 'QUALITY',      value: `${data.health_score}%`,          color: data.health_score >= 80 ? T.ok : data.health_score >= 60 ? T.warn : T.bad },
      { label: 'COMPLETENESS', value: `${comp}%`,                       color: T.acc2 },
    ]
    stats.forEach(({ label, value, color }, i) => {
      const x = M + i * sw
      _doc.setFillColor(255, 255, 255)
      _doc.roundedRect(x, sy, sw - 1.5, 18, 1.5, 1.5, 'F')
      _doc.setFillColor(...color)
      _doc.rect(x, sy, sw - 1.5, 0.6, 'F')
      _doc.setFont('helvetica', 'normal')
      _doc.setFontSize(6.5)
      _doc.setTextColor(...T.muted)
      _doc.text(label, x + (sw - 1.5) / 2, sy + 6, { align: 'center' })
      _doc.setFont('helvetica', 'bold')
      _doc.setFontSize(11)
      _doc.setTextColor(...color)
      _doc.text(value, x + (sw - 1.5) / 2, sy + 14, { align: 'center' })
    })

    // TOC
    const tocY = 140
    _doc.setFillColor(...T.card)
    _doc.roundedRect(M, tocY, CW, 84, 2, 2, 'F')
    _doc.setFillColor(...T.acc2)
    _doc.rect(M, tocY, 3, 84, 'F')

    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(7)
    _doc.setTextColor(...T.acc2)
    _doc.text('TABLE OF CONTENTS', M + 7, tocY + 8)
    _doc.setFillColor(...T.line)
    _doc.rect(M + 7, tocY + 10, CW - 10, 0.2, 'F')

    const toc = [
      'Dataset Overview & Data Quality',
      'Business Signals & Trend Analysis',
      'KPI Performance Analysis',
      'Distribution Insights',
      'Correlation Analysis',
      'Forecast Projections',
      'Customer Segments',
      'ML Model Performance',
      'Business Story & Recommendations',
    ]
    toc.forEach((item, i) => {
      _doc.setFont('helvetica', 'normal')
      _doc.setFontSize(7.5)
      _doc.setTextColor(...T.body)
      _doc.text(`${String(i + 1).padStart(2, '0')}   ${item}`, M + 7, tocY + 16 + i * 7.5)
      _doc.setTextColor(...T.muted)
      _doc.text(String(i + 2), PW - M, tocY + 16 + i * 7.5, { align: 'right' })
    })
  }

  // Footer (both themes)
  _doc.setFillColor(...T.card)
  _doc.rect(0, PH - 12, PW, 12, 'F')
  _doc.setFont('helvetica', 'normal')
  _doc.setFontSize(7)
  _doc.setTextColor(...T.muted)
  _doc.text('Generated by Business Analyzer - AI-Powered Business Intelligence', M, PH - 4)
  _doc.text('1', PW - M, PH - 4, { align: 'right' })
}

// ── Page footers ──────────────────────────────────────────────────────────────
function footers(filename: string) {
  const total = _doc.getNumberOfPages()
  for (let p = 2; p <= total; p++) {
    _doc.setPage(p)
    _doc.setFillColor(...T.card)
    _doc.rect(0, PH - 10, PW, 10, 'F')
    _doc.setFillColor(...T.line)
    _doc.rect(0, PH - 10, PW, 0.25, 'F')
    _doc.setFont('helvetica', 'normal')
    _doc.setFontSize(6.5)
    _doc.setTextColor(...T.muted)
    _doc.text('Business Analyzer  -  ' + filename, M, PH - 4)
    _doc.text(String(p), PW - M, PH - 4, { align: 'right' })
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export function generateBusinessPDF(params: {
  filename:       string
  data:           UploadResponse
  corrResult:     CorrelationResponse | null
  kpiResult:      KpiResponse | null
  forecastResult: ForecastResponse | null
  segmentResult:  SegmentResponse | null
  trainResult:    TrainResponse | null
  insightsResult: InsightsResponse | null
}, theme: 'light' | 'dark' = 'dark') {
  T = theme === 'light' ? LIGHT : DARK

  const { filename, data, corrResult, kpiResult, forecastResult, segmentResult, trainResult, insightsResult } = params
  _doc = new jsPDF('p', 'mm', 'a4')
  bgFill()
  cover(filename, data)

  // ── 01 Dataset Overview ──────────────────────────────────────────────────────
  newPage()
  secHeader('01 - Dataset Overview', 'Data quality metrics and structural summary')

  const comp = (100 - (data.missing_total / Math.max(data.shape[0] * data.shape[1], 1)) * 100).toFixed(1)
  statRow([
    { label: 'Total Rows',   value: data.shape[0].toLocaleString() },
    { label: 'Columns',      value: data.shape[1].toString() },
    { label: 'Numeric',      value: data.numeric_cols.length.toString() },
    { label: 'Categorical',  value: data.cat_cols.length.toString() },
    { label: 'Quality Score',value: `${data.health_score}%`,
      color: data.health_score >= 80 ? T.ok : data.health_score >= 60 ? T.warn : T.bad },
  ])
  statRow([
    { label: 'Complete Rows', value: data.complete_rows.toLocaleString() },
    { label: 'Missing',       value: data.missing_total.toLocaleString(),
      color: data.missing_total > 0 ? T.warn : T.ok },
    { label: 'Duplicates',    value: data.duplicates.toLocaleString(),
      color: data.duplicates > 0 ? T.warn : T.ok },
    { label: 'Memory',        value: `${fmt(data.memory_mb, { dec: 2 })} MB` },
    { label: 'Completeness',  value: `${comp}%` },
  ])

  const mEnt = Object.entries(data.missing).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 12)
  if (mEnt.length) {
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(7.5)
    _doc.setTextColor(...T.muted)
    _doc.text('MISSING VALUES BY COLUMN', M, _y)
    _y += 5
    tbl(
      ['Column', 'Missing Count', 'Missing %', 'Type'],
      mEnt.map(([col, cnt]) => [
        col,
        cnt.toLocaleString(),
        `${((cnt / data.shape[0]) * 100).toFixed(1)}%`,
        data.numeric_cols.includes(col) ? 'Numeric' : 'Categorical',
      ]),
      { 1: { halign: 'right' }, 2: { halign: 'right' } }
    )
  }

  secHeader('Descriptive Statistics', 'Summary statistics for numeric columns')
  const statKeys = ['mean', 'std', 'min', '25%', '50%', '75%', 'max']
  const nCols = data.numeric_cols.slice(0, 8)
  if (nCols.length)
    tbl(
      ['Metric', ...nCols],
      statKeys.map((r) => [
        r,
        ...nCols.map((c) => {
          const v = data.statistics[c]?.[r]
          return v != null ? fmt(v) : '--'
        }),
      ])
    )

  // ── 02 Business Signals ──────────────────────────────────────────────────────
  newPage()
  secHeader('02 - Business Signals & Trends', 'Revenue, cost, profit detection and momentum analysis')

  const bc = data.business_context
  if (bc.revenue_cols.length || bc.cost_cols.length || bc.profit_cols.length)
    statRow([
      { label: 'Revenue Cols', value: bc.revenue_cols.length ? bc.revenue_cols.slice(0, 2).join(', ') : 'None' },
      { label: 'Cost Cols',    value: bc.cost_cols.length    ? bc.cost_cols.slice(0, 2).join(', ')    : 'None' },
      { label: 'Profit Cols',  value: bc.profit_cols.length  ? bc.profit_cols.slice(0, 2).join(', ')  : 'None' },
      { label: 'Date Col',     value: bc.date_col ?? 'None' },
    ])

  const tEnt = Object.entries(data.trends)
  if (tEnt.length) {
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(7.5)
    _doc.setTextColor(...T.muted)
    _doc.text('TREND ANALYSIS BY COLUMN', M, _y)
    _y += 5
    tbl(
      ['Column', 'Direction', 'Strength', 'Monotonic %', 'MoM Growth', 'YoY Growth'],
      tEnt.slice(0, 20).map(([col, t]) => {
        const g   = data.growth_rates[col]
        const dir = t.direction === 'up' ? 'Growing' : t.direction === 'down' ? 'Declining' : 'Stable'
        return [
          col,
          dir,
          `${(t.strength * 100).toFixed(0)}%`,
          `${t.monotonic_pct.toFixed(0)}%`,
          g?.mom != null ? fmtGrowth(g.mom) : '--',
          g?.yoy != null ? fmtGrowth(g.yoy) : '--',
        ]
      })
    )
  }

  const aEnt = Object.entries(data.anomalies).filter(([, v]) => v.count > 0)
  if (aEnt.length) {
    secHeader('Anomaly Detection', 'Columns with statistical outliers')
    tbl(
      ['Column', 'Outlier Count', 'Outlier %', 'First 5 Indices'],
      aEnt.slice(0, 15).map(([col, a]) => [
        col,
        a.count.toString(),
        `${a.pct.toFixed(1)}%`,
        a.indices.slice(0, 5).join(', '),
      ]),
      { 1: { halign: 'right' }, 2: { halign: 'right' } }
    )
  }

  // ── 03 KPI ───────────────────────────────────────────────────────────────────
  newPage()
  secHeader('03 - KPI Performance Analysis', 'Key performance indicator metrics and period-over-period growth')

  if (kpiResult) {
    Object.keys(kpiResult).forEach((col) => {
      const kpi = kpiResult[col]
      chk(30)
      _doc.setFont('helvetica', 'bold')
      _doc.setFontSize(8.5)
      _doc.setTextColor(...T.acc)
      _doc.text(col, M, _y)
      _y += 6
      statRow([
        { label: 'Total', value: kpi.total != null ? fmt(kpi.total) : '--' },
        { label: 'Mean',  value: kpi.mean  != null ? fmt(kpi.mean)  : '--' },
        { label: 'Min',   value: kpi.min   != null ? fmt(kpi.min)   : '--' },
        { label: 'Max',   value: kpi.max   != null ? fmt(kpi.max)   : '--' },
      ])
    })

    const kCols = Object.keys(kpiResult).slice(0, 4)
    if (kCols.length) {
      const preview = Math.min(Math.max(...kCols.map((c) => kpiResult[c].values.length)), 12)
      tbl(
        ['Period', ...kCols.flatMap((c) => [c + ' Value', c + ' Growth'])],
        Array.from({ length: preview }, (_, i) => [
          String(i + 1),
          ...kCols.flatMap((c) => {
            const v = kpiResult[c].values[i]
            const g = kpiResult[c].growth_pct[i]
            return [v != null ? fmt(v) : '--', g != null ? fmtGrowth(g) : '--']
          }),
        ])
      )
    }
  } else {
    bul('KPI Analysis was not run during this session.')
  }

  // ── 04 Distributions ─────────────────────────────────────────────────────────
  newPage()
  secHeader('04 - Distribution Insights', 'Statistical distributions for all numeric columns')

  if (data.numeric_cols.length)
    tbl(
      ['Column', 'Mean', 'Std Dev', 'Min', '25th %ile', 'Median', '75th %ile', 'Max'],
      data.numeric_cols.map((col) => {
        const s = data.statistics[col] ?? {}
        return [
          col,
          ...['mean', 'std', 'min', '25%', '50%', '75%', 'max'].map((k) =>
            s[k] != null ? fmt(s[k] as number) : '--'
          ),
        ]
      })
    )

  if (data.cat_cols.length) {
    secHeader('Categorical Distributions', 'Top values per categorical column')
    data.cat_cols.slice(0, 8).forEach((col) => {
      const summary = data.cat_summary[col]
      if (!summary) return
      const top = Object.entries(summary).sort((a, b) => b[1] - a[1]).slice(0, 5)
      chk(8)
      _doc.setFont('helvetica', 'bold')
      _doc.setFontSize(7.5)
      _doc.setTextColor(...T.muted)
      _doc.text(col, M, _y)
      _y += 4
      tbl(
        ['Value', 'Count', 'Share %'],
        top.map(([v, cnt]) => [v, cnt.toLocaleString(), `${((cnt / data.shape[0]) * 100).toFixed(1)}%`]),
        { 1: { halign: 'right' }, 2: { halign: 'right' } }
      )
    })
  }

  // ── 05 Correlations ──────────────────────────────────────────────────────────
  newPage()
  secHeader('05 - Correlation Analysis', 'Feature relationships and dependencies')

  if (corrResult) {
    const pairs = corrResult.pairs
      .filter((p) => p.correlation != null)
      .sort((a, b) => Math.abs(b.correlation ?? 0) - Math.abs(a.correlation ?? 0))
      .slice(0, 20)
    if (pairs.length)
      tbl(
        ['Feature 1', 'Feature 2', 'Correlation', 'Strength', 'Direction'],
        pairs.map((p) => {
          const v   = p.correlation ?? 0
          const abs = Math.abs(v)
          const s   = abs > 0.8 ? 'Very Strong' : abs > 0.6 ? 'Strong' : abs > 0.4 ? 'Moderate' : abs > 0.2 ? 'Weak' : 'Very Weak'
          return [p.feature1, p.feature2, v.toFixed(3), s, v > 0 ? 'Positive' : 'Negative']
        })
      )
  } else {
    bul('Correlation analysis data not available.')
  }

  // ── 06 Forecast ──────────────────────────────────────────────────────────────
  newPage()
  secHeader('06 - Forecast Projections', 'Time-series forecasting and confidence intervals')

  if (forecastResult) {
    statRow([
      { label: 'Target Column',  value: forecastResult.target_col },
      { label: 'Historical Pts', value: forecastResult.historical.length.toString() },
      { label: 'Forecast Pts',   value: forecastResult.forecasted.length.toString() },
      { label: 'Residual Std',   value: forecastResult.std_residual != null ? `+/-${fmt(forecastResult.std_residual)}` : '--' },
    ])

    const hist = forecastResult.historical.slice(-12)
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(7.5)
    _doc.setTextColor(...T.muted)
    _doc.text('HISTORICAL (LAST 12 PERIODS)', M, _y)
    _y += 4
    tbl(
      ['Period', 'Actual Value', 'Fitted Value'],
      hist.map((h) => [
        String(h.index),
        h.value != null ? fmt(h.value) : '--',
        h.fitted != null ? fmt(h.fitted) : '--',
      ]),
      { 1: { halign: 'right' }, 2: { halign: 'right' } }
    )

    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(7.5)
    _doc.setTextColor(...T.muted)
    _doc.text('FORECAST PERIODS', M, _y)
    _y += 4
    tbl(
      ['Period', 'Forecasted Value', 'Lower Bound', 'Upper Bound'],
      forecastResult.forecasted.map((f) => [
        String(f.index),
        f.value != null ? fmt(f.value) : '--',
        f.lower != null ? fmt(f.lower) : '--',
        f.upper != null ? fmt(f.upper) : '--',
      ]),
      { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    )
  } else {
    bul('Forecast was not run during this session.')
  }

  // ── 07 Segments ──────────────────────────────────────────────────────────────
  newPage()
  secHeader('07 - Customer Segments', 'K-Means clustering and segment profiles')

  if (segmentResult) {
    statRow([
      { label: 'Clusters',      value: segmentResult.n_clusters.toString() },
      { label: 'Columns Used',  value: segmentResult.columns_used.slice(0, 3).join(', ') },
      { label: 'Total Records', value: data.shape[0].toLocaleString() },
    ])
    Object.entries(segmentResult.profiles).forEach(([name, prof]) => {
      chk(20)
      _doc.setFont('helvetica', 'bold')
      _doc.setFontSize(8)
      _doc.setTextColor(...T.acc)
      _doc.text(`${name}  -  ${prof.count.toLocaleString()} records (${prof.pct.toFixed(1)}%)`, M, _y)
      _y += 5
      const keys = Object.keys(prof).filter((k) => k !== 'count' && k !== 'pct')
      if (keys.length)
        tbl(
          ['Metric', 'Mean Value'],
          keys.slice(0, 8).map((k) => [k, prof[k] != null ? fmt(prof[k] as number) : '--']),
          { 1: { halign: 'right' } }
        )
    })
  } else {
    bul('Segmentation was not run during this session.')
  }

  // ── 08 ML Model ──────────────────────────────────────────────────────────────
  newPage()
  secHeader('08 - ML Model Performance', 'Machine learning training results and feature importance')

  if (trainResult) {
    statRow([
      { label: 'Algorithm',    value: trainResult.algorithm },
      { label: 'Problem Type', value: trainResult.problem_type },
      { label: 'Train Samples',value: trainResult.train_samples.toLocaleString() },
      { label: 'Test Samples', value: trainResult.test_samples.toLocaleString() },
      { label: 'Features',     value: trainResult.features.toString() },
    ])

    const mRows: string[][] = []
    if (trainResult.metrics.r2 != null)
      mRows.push([
        'R2 Score',
        trainResult.metrics.r2.toFixed(4),
        trainResult.metrics.r2 >= 0.8 ? 'Excellent' : trainResult.metrics.r2 >= 0.6 ? 'Good' : 'Fair',
      ])
    if (trainResult.metrics.rmse != null) mRows.push(['RMSE', fmt(trainResult.metrics.rmse), '--'])
    if (trainResult.metrics.mae  != null) mRows.push(['MAE',  fmt(trainResult.metrics.mae),  '--'])
    if (trainResult.metrics.accuracy != null)
      mRows.push([
        'Accuracy',
        `${(trainResult.metrics.accuracy * 100).toFixed(2)}%`,
        trainResult.metrics.accuracy >= 0.85 ? 'Excellent' : trainResult.metrics.accuracy >= 0.7 ? 'Good' : 'Fair',
      ])
    if (mRows.length) tbl(['Metric', 'Value', 'Rating'], mRows)

    if (trainResult.feature_importance) {
      secHeader('Feature Importance', 'Top 15 most influential predictors')
      const fi       = trainResult.feature_importance
      const cumScale = fi.cumulative?.[0] != null && fi.cumulative[0] > 1 ? 1 : 100
      const maxScore = fi.scores[0] ?? 1

      fiTbl(
        ['Rank', 'Feature', 'Score', 'Cumulative %', 'Visual'],
        fi.features.slice(0, 15).map((f, i) => [
          String(i + 1),
          f,
          fi.scores[i].toFixed(4),
          fi.cumulative?.[i] != null ? `${(fi.cumulative[i] * cumScale).toFixed(1)}%` : '--',
          String(fi.scores[i]), // raw score for bar rendering
        ]),
        maxScore
      )
    }

    if (trainResult.confusion_matrix && trainResult.problem_type === 'classification') {
      secHeader('Confusion Matrix', 'Classification prediction matrix')
      const cm = trainResult.confusion_matrix
      tbl(
        ['', ...cm[0].map((_, j) => `Predicted ${j}`)],
        cm.map((row, i) => [`Actual ${i}`, ...row.map(String)])
      )
    }
  } else {
    bul('ML model was not trained during this session.')
  }

  // ── 09 Business Story ────────────────────────────────────────────────────────
  newPage()
  secHeader('09 - Business Story & Recommendations', 'Synthesized narrative and actionable insights')

  const bc2   = data.business_context
  const comp2 = (100 - (data.missing_total / Math.max(data.shape[0] * data.shape[1], 1)) * 100).toFixed(1)

  const story: { heading: string; points: string[] }[] = [
    {
      heading: 'Dataset Overview',
      points: [
        `${data.shape[0].toLocaleString()} records across ${data.shape[1]} columns (${data.numeric_cols.length} numeric, ${data.cat_cols.length} categorical).`,
        `Data completeness: ${comp2}%  -  Quality score: ${data.health_score}%`,
        data.duplicates > 0
          ? `${data.duplicates.toLocaleString()} duplicate rows found.`
          : 'No duplicate rows detected.',
      ],
    },
  ]

  const sigs: string[] = []
  if (bc2.revenue_cols.length) {
    const rc = bc2.revenue_cols[0]
    const t  = data.trends[rc]
    if (t)
      sigs.push(
        `Revenue (${rc}) is ${t.direction === 'up' ? 'growing (up)' : t.direction === 'down' ? 'declining (dn)' : 'stable'} (${(t.strength * 100).toFixed(0)}% strength).`
      )
  }
  if (bc2.cost_cols.length && data.trends[bc2.cost_cols[0]]?.direction === 'up')
    sigs.push(`Costs (${bc2.cost_cols[0]}) are rising -- monitor against revenue growth.`)

  const sUp = data.numeric_cols.filter((c) => data.trends[c]?.direction === 'up'   && data.trends[c]?.strength > 0.6)
  const sDn = data.numeric_cols.filter((c) => data.trends[c]?.direction === 'down' && data.trends[c]?.strength > 0.6)
  if (sUp.length) sigs.push(`${sUp.length} metric(s) with strong upward momentum: ${sUp.slice(0, 3).join(', ')}.`)
  if (sDn.length) sigs.push(`${sDn.length} metric(s) in consistent decline: ${sDn.slice(0, 3).join(', ')}.`)
  if (sigs.length) story.push({ heading: 'Business Signals', points: sigs })

  if (corrResult?.pairs.length) {
    const top = corrResult.pairs[0]
    const v   = top.correlation ?? 0
    if (Math.abs(v) > 0.5)
      story.push({
        heading: 'Key Correlation Finding',
        points:  [`Strong ${v > 0 ? 'positive' : 'negative'} correlation between ${top.feature1} and ${top.feature2} (${v.toFixed(2)}).`],
      })
  }

  if (trainResult?.metrics) {
    const m     = trainResult.metrics
    const mlPts: string[] = [`${trainResult.algorithm} trained on ${trainResult.train_samples.toLocaleString()} samples.`]
    if (m.r2 != null)
      mlPts.push(`R2 = ${m.r2.toFixed(3)} -- ${m.r2 >= 0.8 ? 'Strong predictive power.' : m.r2 >= 0.5 ? 'Moderate predictive power.' : 'Low predictive power.'}`)
    if (m.accuracy != null)
      mlPts.push(`Accuracy: ${(m.accuracy * 100).toFixed(1)}%`)
    if (trainResult.feature_importance)
      mlPts.push(`Top driver: ${trainResult.feature_importance.features[0]}`)
    story.push({ heading: 'ML Model Insights', points: mlPts })
  }

  const recs = data.recommendations
  const acts = [
    ...recs.kpi.slice(0, 2),
    ...recs.forecast.slice(0, 1),
    ...recs.ml_targets.slice(0, 2),
    ...recs.correlations.slice(0, 1),
  ].filter(Boolean)
  if (acts.length) story.push({ heading: 'Recommended Actions', points: acts })
  if (insightsResult?.insights.length)
    story.push({ heading: 'AI-Generated Insights', points: insightsResult.insights.slice(0, 8) })

  story.forEach(({ heading, points }) => {
    chk(20)
    _doc.setFillColor(...T.card)
    _doc.roundedRect(M, _y, CW, 10, 1, 1, 'F')
    _doc.setFont('helvetica', 'bold')
    _doc.setFontSize(8)
    _doc.setTextColor(...T.acc)
    _doc.text(heading.toUpperCase(), M + 5, _y + 6.5)
    _y += 14
    points.forEach((p) => bul(p))
    _y += 3
  })

  footers(filename)
  _doc.save(`business-analysis-${filename.replace(/\.[^.]+$/, '')}-${theme}.pdf`)
}
