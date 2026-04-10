import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  UploadResponse, CorrelationResponse, KpiResponse,
  ForecastResponse, SegmentResponse, TrainResponse, InsightsResponse,
} from '../../types'
import { fmt, fmtGrowth } from '../../utils/format'

const C = {
  bg:      [8,  8,  8]   as [number, number, number],
  surface: [18, 18, 18]  as [number, number, number],
  surf2:   [26, 26, 26]  as [number, number, number],
  border:  [38, 38, 38]  as [number, number, number],
  accent:  [139, 92, 246] as [number, number, number],
  accent2: [59, 130, 246] as [number, number, number],
  green:   [52, 211, 153] as [number, number, number],
  red:     [251, 113, 133] as [number, number, number],
  yellow:  [251, 191, 36] as [number, number, number],
  white:   [255, 255, 255] as [number, number, number],
  muted:   [160, 160, 160] as [number, number, number],
  dim:     [80,  80,  80]  as [number, number, number],
}
const PW = 210, PH = 297, M = 16, CW = PW - M * 2
let _y = 0

function newPage(doc: jsPDF) {
  doc.addPage(); _y = 20
  doc.setFillColor(...C.bg); doc.rect(0, 0, PW, PH, 'F')
  doc.setFillColor(...C.border); doc.rect(0, 0, PW, 0.4, 'F')
}
function chk(doc: jsPDF, n: number) { if (_y + n > PH - 20) newPage(doc) }

function secHeader(doc: jsPDF, title: string, sub?: string) {
  chk(doc, 22)
  doc.setFillColor(...C.accent); doc.rect(M, _y, 3, sub ? 10 : 8, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.white)
  doc.text(title.toUpperCase(), M + 7, _y + (sub ? 4 : 5.5))
  if (sub) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...C.muted)
    doc.text(sub, M + 7, _y + 9)
  }
  _y += sub ? 16 : 13
  doc.setFillColor(...C.border); doc.rect(M, _y, CW, 0.3, 'F'); _y += 5
}

function bul(doc: jsPDF, text: string) {
  const lines = doc.splitTextToSize(text, CW - 5) as string[]
  chk(doc, lines.length * 5 + 3)
  doc.setFillColor(...C.accent); doc.circle(M + 1.2, _y + 1.2, 0.9, 'F')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.muted)
  doc.text(lines, M + 5, _y + 2.5); _y += lines.length * 4.8 + 2
}

function statRow(doc: jsPDF, items: { label: string; value: string; color?: [number,number,number] }[]) {
  chk(doc, 22)
  const cw = CW / items.length
  doc.setFillColor(...C.surface); doc.roundedRect(M, _y, CW, 16, 1, 1, 'F')
  items.forEach(({ label, value, color }, i) => {
    const x = M + i * cw + cw / 2
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.dim)
    doc.text(label.toUpperCase(), x, _y + 5, { align: 'center' })
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...(color ?? C.white))
    doc.text(value, x, _y + 12, { align: 'center' })
  }); _y += 22
}

function tbl(
  doc: jsPDF, heads: string[], rows: string[][],
  cs?: Record<number, { halign?: 'left' | 'right' | 'center' }>
) {
  if (!rows.length) return; chk(doc, 20)
  autoTable(doc, {
    startY: _y, head: [heads], body: rows, theme: 'plain',
    styles: { font: 'helvetica', fontSize: 7.5, textColor: C.muted, fillColor: C.surface,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, lineColor: C.border, lineWidth: 0.2 },
    headStyles: { fillColor: C.surf2, textColor: C.dim, fontSize: 6.5, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.bg },
    margin: { left: M, right: M }, columnStyles: cs ?? {},
  })
  _y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
}

function cover(doc: jsPDF, filename: string, data: UploadResponse) {
  doc.setFillColor(...C.bg); doc.rect(0, 0, PW, PH, 'F')
  for (let i = 0; i < 60; i++) {
    const a = ((60 - i) / 60) * 0.8
    doc.setFillColor(Math.round(C.accent[0]*a), Math.round(C.accent[1]*a), Math.round(C.accent[2]*a))
    doc.circle(PW + 10, -10, 80 - i * 1.1, 'F')
  }
  for (let i = 0; i < 40; i++) {
    const a = ((40 - i) / 40) * 0.25
    doc.setFillColor(Math.round(C.accent2[0]*a), Math.round(C.accent2[1]*a), Math.round(C.accent2[2]*a))
    doc.circle(-10, PH + 5, 50 - i * 0.9, 'F')
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.accent)
  doc.text('BUSINESS ANALYZER  \u00b7  AI-POWERED INTELLIGENCE', M, 38)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(36); doc.setTextColor(...C.white)
  doc.text('Business', M, 68); doc.text('Analysis', M, 85)
  doc.setFillColor(...C.accent); doc.rect(M, 90, 40, 1.2, 'F')
  doc.setFillColor(...C.accent2); doc.rect(M + 42, 90, 20, 1.2, 'F')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.muted)
  doc.text('Report', M, 100)
  doc.setFillColor(...C.border); doc.rect(M, 118, CW, 0.3, 'F')
  const sf = filename.length > 55 ? filename.substring(0, 52) + '...' : filename
  doc.setFontSize(7); doc.setTextColor(...C.dim); doc.text('FILE', M, 128)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.white); doc.text(sf, M, 134)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.dim)
  doc.text('GENERATED ON', M + 100, 128)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.white)
  doc.text(
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    M + 100, 134
  )
  const sy = 148, sw = CW / 4
  const comp = (100 - (data.missing_total / Math.max(data.shape[0] * data.shape[1], 1)) * 100).toFixed(1)
  doc.setFillColor(...C.surface); doc.roundedRect(M, sy, CW, 40, 2, 2, 'F')
  doc.setFillColor(...C.border); doc.roundedRect(M, sy, CW, 40, 2, 2, 'S')
  const stats = [
    { label: 'ROWS', value: data.shape[0].toLocaleString() },
    { label: 'COLUMNS', value: data.shape[1].toString() },
    { label: 'QUALITY', value: `${data.health_score}%` },
    { label: 'COMPLETENESS', value: `${comp}%` },
  ]
  stats.forEach(({ label, value }, i) => {
    const x = M + i * sw + sw / 2
    if (i > 0) { doc.setFillColor(...C.border); doc.rect(M + i * sw, sy + 8, 0.3, 24, 'F') }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...C.dim)
    doc.text(label, x, sy + 13, { align: 'center' })
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...C.white)
    doc.text(value, x, sy + 28, { align: 'center' })
  })
  const tocY = 200
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...C.dim)
  doc.text('TABLE OF CONTENTS', M, tocY)
  doc.setFillColor(...C.border); doc.rect(M, tocY + 2, CW, 0.3, 'F')
  const toc = [
    'Dataset Overview & Data Quality', 'Business Signals & Trend Analysis',
    'KPI Performance Analysis', 'Distribution Insights', 'Correlation Analysis',
    'Forecast Projections', 'Customer Segments', 'ML Model Performance',
    'Business Story & Recommendations',
  ]
  toc.forEach((item, i) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C.muted)
    doc.text(`${String(i + 1).padStart(2, '0')}   ${item}`, M, tocY + 10 + i * 8)
    doc.setTextColor(...C.dim); doc.text(String(i + 2), PW - M, tocY + 10 + i * 8, { align: 'right' })
  })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.dim)
  doc.text('Generated by Business Analyzer \u2014 AI-Powered Business Intelligence', M, PH - 10)
  doc.text('1', PW - M, PH - 10, { align: 'right' })
}

function footers(doc: jsPDF, filename: string) {
  const total = doc.getNumberOfPages()
  for (let p = 2; p <= total; p++) {
    doc.setPage(p)
    doc.setFillColor(...C.border); doc.rect(0, PH - 12, PW, 0.3, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...C.dim)
    doc.text('Business Analyzer  \u00b7  ' + filename, M, PH - 6)
    doc.text(String(p), PW - M, PH - 6, { align: 'right' })
  }
}

export function generateBusinessPDF(params: {
  filename: string; data: UploadResponse; corrResult: CorrelationResponse | null
  kpiResult: KpiResponse | null; forecastResult: ForecastResponse | null
  segmentResult: SegmentResponse | null; trainResult: TrainResponse | null
  insightsResult: InsightsResponse | null
}) {
  const { filename, data, corrResult, kpiResult, forecastResult, segmentResult, trainResult, insightsResult } = params
  const doc = new jsPDF('p', 'mm', 'a4')
  cover(doc, filename, data)

  // 01 Dataset Overview
  newPage(doc)
  secHeader(doc, '01 \u2014 Dataset Overview', 'Data quality metrics and structural summary')
  const comp = (100 - (data.missing_total / Math.max(data.shape[0] * data.shape[1], 1)) * 100).toFixed(1)
  statRow(doc, [
    { label: 'Total Rows', value: data.shape[0].toLocaleString() },
    { label: 'Columns', value: data.shape[1].toString() },
    { label: 'Numeric', value: data.numeric_cols.length.toString() },
    { label: 'Categorical', value: data.cat_cols.length.toString() },
    { label: 'Quality Score', value: `${data.health_score}%`,
      color: data.health_score >= 80 ? C.green : data.health_score >= 60 ? C.yellow : C.red },
  ])
  statRow(doc, [
    { label: 'Complete Rows', value: data.complete_rows.toLocaleString() },
    { label: 'Missing', value: data.missing_total.toLocaleString(), color: data.missing_total > 0 ? C.yellow : C.green },
    { label: 'Duplicates', value: data.duplicates.toLocaleString(), color: data.duplicates > 0 ? C.yellow : C.green },
    { label: 'Memory', value: `${fmt(data.memory_mb, { dec: 2 })} MB` },
    { label: 'Completeness', value: `${comp}%` },
  ])
  const mEnt = Object.entries(data.missing).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 12)
  if (mEnt.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.muted)
    doc.text('MISSING VALUES BY COLUMN', M, _y); _y += 5
    tbl(doc, ['Column', 'Missing Count', 'Missing %', 'Type'],
      mEnt.map(([col, cnt]) => [col, cnt.toLocaleString(),
        `${((cnt / data.shape[0]) * 100).toFixed(1)}%`,
        data.numeric_cols.includes(col) ? 'Numeric' : 'Categorical']),
      { 1: { halign: 'right' }, 2: { halign: 'right' } })
  }
  secHeader(doc, 'Descriptive Statistics', 'Summary statistics for numeric columns')
  const statKeys = ['mean', 'std', 'min', '25%', '50%', '75%', 'max']
  const nCols = data.numeric_cols.slice(0, 8)
  if (nCols.length)
    tbl(doc, ['Metric', ...nCols],
      statKeys.map((r) => [r, ...nCols.map((c) => { const v = data.statistics[c]?.[r]; return v != null ? fmt(v) : '\u2014' })]))

  // 02 Business Signals
  newPage(doc)
  secHeader(doc, '02 \u2014 Business Signals & Trends', 'Revenue, cost, profit detection and momentum analysis')
  const bc = data.business_context
  if (bc.revenue_cols.length || bc.cost_cols.length || bc.profit_cols.length)
    statRow(doc, [
      { label: 'Revenue Cols', value: bc.revenue_cols.length ? bc.revenue_cols.slice(0, 2).join(', ') : 'None' },
      { label: 'Cost Cols', value: bc.cost_cols.length ? bc.cost_cols.slice(0, 2).join(', ') : 'None' },
      { label: 'Profit Cols', value: bc.profit_cols.length ? bc.profit_cols.slice(0, 2).join(', ') : 'None' },
      { label: 'Date Col', value: bc.date_col ?? 'None' },
    ])
  const tEnt = Object.entries(data.trends)
  if (tEnt.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.muted)
    doc.text('TREND ANALYSIS BY COLUMN', M, _y); _y += 5
    tbl(doc, ['Column', 'Direction', 'Strength', 'Monotonic %', 'MoM Growth', 'YoY Growth'],
      tEnt.slice(0, 20).map(([col, t]) => {
        const g = data.growth_rates[col]
        const dir = t.direction === 'up' ? '\u2191 Growing' : t.direction === 'down' ? '\u2193 Declining' : '\u2192 Stable'
        return [col, dir, `${(t.strength * 100).toFixed(0)}%`, `${t.monotonic_pct.toFixed(0)}%`,
          g?.mom != null ? fmtGrowth(g.mom) : '\u2014', g?.yoy != null ? fmtGrowth(g.yoy) : '\u2014']
      }))
  }
  const aEnt = Object.entries(data.anomalies).filter(([, v]) => v.count > 0)
  if (aEnt.length) {
    secHeader(doc, 'Anomaly Detection', 'Columns with statistical outliers')
    tbl(doc, ['Column', 'Outlier Count', 'Outlier %', 'First 5 Indices'],
      aEnt.slice(0, 15).map(([col, a]) => [col, a.count.toString(), `${a.pct.toFixed(1)}%`, a.indices.slice(0, 5).join(', ')]),
      { 1: { halign: 'right' }, 2: { halign: 'right' } })
  }

  // 03 KPI
  newPage(doc)
  secHeader(doc, '03 \u2014 KPI Performance Analysis', 'Key performance indicator metrics and period-over-period growth')
  if (kpiResult) {
    Object.keys(kpiResult).forEach((col) => {
      const kpi = kpiResult[col]; chk(doc, 30)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.accent)
      doc.text(col, M, _y); _y += 6
      statRow(doc, [
        { label: 'Total', value: kpi.total != null ? fmt(kpi.total) : '\u2014' },
        { label: 'Mean', value: kpi.mean != null ? fmt(kpi.mean) : '\u2014' },
        { label: 'Min', value: kpi.min != null ? fmt(kpi.min) : '\u2014' },
        { label: 'Max', value: kpi.max != null ? fmt(kpi.max) : '\u2014' },
      ])
    })
    const kCols = Object.keys(kpiResult).slice(0, 4)
    if (kCols.length) {
      const preview = Math.min(Math.max(...kCols.map((c) => kpiResult[c].values.length)), 12)
      tbl(doc, ['Period', ...kCols.flatMap((c) => [c + ' Value', c + ' Growth'])],
        Array.from({ length: preview }, (_, i) => [
          String(i + 1),
          ...kCols.flatMap((c) => {
            const v = kpiResult[c].values[i]; const g = kpiResult[c].growth_pct[i]
            return [v != null ? fmt(v) : '\u2014', g != null ? fmtGrowth(g) : '\u2014']
          }),
        ]))
    }
  } else { bul(doc, 'KPI Analysis was not run during this session.') }

  // 04 Distributions
  newPage(doc)
  secHeader(doc, '04 \u2014 Distribution Insights', 'Statistical distributions for all numeric columns')
  if (data.numeric_cols.length)
    tbl(doc, ['Column', 'Mean', 'Std Dev', 'Min', '25th %ile', 'Median', '75th %ile', 'Max'],
      data.numeric_cols.map((col) => {
        const s = data.statistics[col] ?? {}
        return [col, ...['mean', 'std', 'min', '25%', '50%', '75%', 'max'].map((k) => s[k] != null ? fmt(s[k]) : '\u2014')]
      }))
  if (data.cat_cols.length) {
    secHeader(doc, 'Categorical Distributions', 'Top values per categorical column')
    data.cat_cols.slice(0, 8).forEach((col) => {
      const summary = data.cat_summary[col]; if (!summary) return
      const top = Object.entries(summary).sort((a, b) => b[1] - a[1]).slice(0, 5)
      chk(doc, 8)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.muted)
      doc.text(col, M, _y); _y += 4
      tbl(doc, ['Value', 'Count', 'Share %'],
        top.map(([v, cnt]) => [v, cnt.toLocaleString(), `${((cnt / data.shape[0]) * 100).toFixed(1)}%`]),
        { 1: { halign: 'right' }, 2: { halign: 'right' } })
    })
  }

  // 05 Correlations
  newPage(doc)
  secHeader(doc, '05 \u2014 Correlation Analysis', 'Feature relationships and dependencies')
  if (corrResult) {
    const pairs = corrResult.pairs
      .filter((p) => p.correlation != null)
      .sort((a, b) => Math.abs(b.correlation ?? 0) - Math.abs(a.correlation ?? 0))
      .slice(0, 20)
    if (pairs.length)
      tbl(doc, ['Feature 1', 'Feature 2', 'Correlation', 'Strength', 'Direction'],
        pairs.map((p) => {
          const v = p.correlation ?? 0; const abs = Math.abs(v)
          const s = abs > 0.8 ? 'Very Strong' : abs > 0.6 ? 'Strong' : abs > 0.4 ? 'Moderate' : abs > 0.2 ? 'Weak' : 'Very Weak'
          return [p.feature1, p.feature2, v.toFixed(3), s, v > 0 ? 'Positive \u2191' : 'Negative \u2193']
        }))
  } else { bul(doc, 'Correlation analysis data not available.') }

  // 06 Forecast
  newPage(doc)
  secHeader(doc, '06 \u2014 Forecast Projections', 'Time-series forecasting and confidence intervals')
  if (forecastResult) {
    statRow(doc, [
      { label: 'Target Column', value: forecastResult.target_col },
      { label: 'Historical Pts', value: forecastResult.historical.length.toString() },
      { label: 'Forecast Pts', value: forecastResult.forecasted.length.toString() },
      { label: 'Residual Std', value: forecastResult.std_residual != null ? `\u00b1${fmt(forecastResult.std_residual)}` : '\u2014' },
    ])
    const hist = forecastResult.historical.slice(-12)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.muted)
    doc.text('HISTORICAL (LAST 12 PERIODS)', M, _y); _y += 4
    tbl(doc, ['Period', 'Actual Value', 'Fitted Value'],
      hist.map((h) => [String(h.index), h.value != null ? fmt(h.value) : '\u2014', h.fitted != null ? fmt(h.fitted) : '\u2014']),
      { 1: { halign: 'right' }, 2: { halign: 'right' } })
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.muted)
    doc.text('FORECAST PERIODS', M, _y); _y += 4
    tbl(doc, ['Period', 'Forecasted Value', 'Lower Bound', 'Upper Bound'],
      forecastResult.forecasted.map((f) => [
        String(f.index),
        f.value != null ? fmt(f.value) : '\u2014',
        f.lower != null ? fmt(f.lower) : '\u2014',
        f.upper != null ? fmt(f.upper) : '\u2014',
      ]),
      { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } })
  } else { bul(doc, 'Forecast was not run during this session.') }

  // 07 Segments
  newPage(doc)
  secHeader(doc, '07 \u2014 Customer Segments', 'K-Means clustering and segment profiles')
  if (segmentResult) {
    statRow(doc, [
      { label: 'Clusters', value: segmentResult.n_clusters.toString() },
      { label: 'Columns Used', value: segmentResult.columns_used.slice(0, 3).join(', ') },
      { label: 'Total Records', value: data.shape[0].toLocaleString() },
    ])
    Object.entries(segmentResult.profiles).forEach(([name, prof]) => {
      chk(doc, 20)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.accent)
      doc.text(`${name}  \u2014  ${prof.count.toLocaleString()} records (${prof.pct.toFixed(1)}%)`, M, _y); _y += 5
      const keys = Object.keys(prof).filter((k) => k !== 'count' && k !== 'pct')
      if (keys.length)
        tbl(doc, ['Metric', 'Mean Value'],
          keys.slice(0, 8).map((k) => [k, prof[k] != null ? fmt(prof[k] as number) : '\u2014']),
          { 1: { halign: 'right' } })
    })
  } else { bul(doc, 'Segmentation was not run during this session.') }

  // 08 ML Model
  newPage(doc)
  secHeader(doc, '08 \u2014 ML Model Performance', 'Machine learning training results and feature importance')
  if (trainResult) {
    statRow(doc, [
      { label: 'Algorithm', value: trainResult.algorithm },
      { label: 'Problem Type', value: trainResult.problem_type },
      { label: 'Train Samples', value: trainResult.train_samples.toLocaleString() },
      { label: 'Test Samples', value: trainResult.test_samples.toLocaleString() },
      { label: 'Features', value: trainResult.features.toString() },
    ])
    const mRows: string[][] = []
    if (trainResult.metrics.r2 != null)
      mRows.push(['R\u00b2 Score', trainResult.metrics.r2.toFixed(4),
        trainResult.metrics.r2 >= 0.8 ? 'Excellent' : trainResult.metrics.r2 >= 0.6 ? 'Good' : 'Fair'])
    if (trainResult.metrics.rmse != null) mRows.push(['RMSE', fmt(trainResult.metrics.rmse), '\u2014'])
    if (trainResult.metrics.mae != null) mRows.push(['MAE', fmt(trainResult.metrics.mae), '\u2014'])
    if (trainResult.metrics.accuracy != null)
      mRows.push(['Accuracy', `${(trainResult.metrics.accuracy * 100).toFixed(2)}%`,
        trainResult.metrics.accuracy >= 0.85 ? 'Excellent' : trainResult.metrics.accuracy >= 0.7 ? 'Good' : 'Fair'])
    if (mRows.length) tbl(doc, ['Metric', 'Value', 'Rating'], mRows)
    if (trainResult.feature_importance) {
      secHeader(doc, 'Feature Importance', 'Top 15 most influential predictors')
      const fi = trainResult.feature_importance
      tbl(doc, ['Rank', 'Feature', 'Importance Score', 'Cumulative %'],
        fi.features.slice(0, 15).map((f, i) => [
          String(i + 1), f, fi.scores[i].toFixed(4), `${(fi.cumulative[i] * 100).toFixed(1)}%`,
        ]),
        { 2: { halign: 'right' }, 3: { halign: 'right' } })
    }
    if (trainResult.confusion_matrix && trainResult.problem_type === 'classification') {
      secHeader(doc, 'Confusion Matrix', 'Classification prediction matrix')
      const cm = trainResult.confusion_matrix
      tbl(doc, ['', ...cm[0].map((_, j) => `Predicted ${j}`)], cm.map((row, i) => [`Actual ${i}`, ...row.map(String)]))
    }
  } else { bul(doc, 'ML model was not trained during this session.') }

  // 09 Story
  newPage(doc)
  secHeader(doc, '09 \u2014 Business Story & Recommendations', 'Synthesized narrative and actionable insights')
  const bc2 = data.business_context
  const comp2 = (100 - (data.missing_total / Math.max(data.shape[0] * data.shape[1], 1)) * 100).toFixed(1)
  const story: { heading: string; points: string[] }[] = [
    { heading: 'Dataset Overview', points: [
        `${data.shape[0].toLocaleString()} records across ${data.shape[1]} columns (${data.numeric_cols.length} numeric, ${data.cat_cols.length} categorical).`,
        `Data completeness: ${comp2}%  \u00b7  Quality score: ${data.health_score}%`,
        data.duplicates > 0 ? `${data.duplicates.toLocaleString()} duplicate rows found.` : 'No duplicate rows detected.',
    ]},
  ]
  const sigs: string[] = []
  if (bc2.revenue_cols.length) {
    const rc = bc2.revenue_cols[0]; const t = data.trends[rc]
    if (t) sigs.push(`Revenue (${rc}) is ${t.direction === 'up' ? 'growing \u2191' : t.direction === 'down' ? 'declining \u2193' : 'stable \u2192'} (${(t.strength * 100).toFixed(0)}% strength).`)
  }
  if (bc2.cost_cols.length && data.trends[bc2.cost_cols[0]]?.direction === 'up')
    sigs.push(`Costs (${bc2.cost_cols[0]}) are rising \u2014 monitor against revenue growth.`)
  const sUp = data.numeric_cols.filter((c) => data.trends[c]?.direction === 'up' && data.trends[c]?.strength > 0.6)
  const sDn = data.numeric_cols.filter((c) => data.trends[c]?.direction === 'down' && data.trends[c]?.strength > 0.6)
  if (sUp.length) sigs.push(`${sUp.length} metric(s) with strong upward momentum: ${sUp.slice(0, 3).join(', ')}.`)
  if (sDn.length) sigs.push(`${sDn.length} metric(s) in consistent decline: ${sDn.slice(0, 3).join(', ')}.`)
  if (sigs.length) story.push({ heading: 'Business Signals', points: sigs })
  if (corrResult?.pairs.length) {
    const top = corrResult.pairs[0]; const v = top.correlation ?? 0
    if (Math.abs(v) > 0.5)
      story.push({ heading: 'Key Correlation Finding',
        points: [`Strong ${v > 0 ? 'positive' : 'negative'} correlation between ${top.feature1} and ${top.feature2} (${v.toFixed(2)}).`] })
  }
  if (trainResult?.metrics) {
    const m = trainResult.metrics
    const mlPts: string[] = [`${trainResult.algorithm} trained on ${trainResult.train_samples.toLocaleString()} samples.`]
    if (m.r2 != null) mlPts.push(`R\u00b2 = ${m.r2.toFixed(3)} \u2014 ${m.r2 >= 0.8 ? 'Strong predictive power.' : m.r2 >= 0.5 ? 'Moderate predictive power.' : 'Low predictive power.'}`)
    if (m.accuracy != null) mlPts.push(`Accuracy: ${(m.accuracy * 100).toFixed(1)}%`)
    if (trainResult.feature_importance) mlPts.push(`Top driver: ${trainResult.feature_importance.features[0]}`)
    story.push({ heading: 'ML Model Insights', points: mlPts })
  }
  const recs = data.recommendations
  const acts = [...recs.kpi.slice(0, 2), ...recs.forecast.slice(0, 1), ...recs.ml_targets.slice(0, 2), ...recs.correlations.slice(0, 1)].filter(Boolean)
  if (acts.length) story.push({ heading: 'Recommended Actions', points: acts })
  if (insightsResult?.insights.length) story.push({ heading: 'AI-Generated Insights', points: insightsResult.insights.slice(0, 8) })
  story.forEach(({ heading, points }) => {
    chk(doc, 20)
    doc.setFillColor(...C.surface); doc.roundedRect(M, _y, CW, 10, 1, 1, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.accent)
    doc.text(heading.toUpperCase(), M + 5, _y + 6.5); _y += 14
    points.forEach((p) => bul(doc, p)); _y += 3
  })
  footers(doc, filename)
  doc.save(`business-analysis-${filename.replace(/\.[^.]+$/, '')}.pdf`)
}
