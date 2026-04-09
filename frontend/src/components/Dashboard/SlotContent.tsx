import { useState } from 'react'
import { Overview }      from './Overview'
import { Trends }        from './Trends'
import { KPIAnalysis }   from './KPIAnalysis'
import { Distributions } from './Distributions'
import { Correlations }  from './Correlations'
import { Forecast }      from './Forecast'
import { Segments }      from './Segments'
import { MLModel }       from './MLModel'
import { Story }         from './Story'
import { AlertBanner }   from '../UI/AlertBanner'
import { ColumnRenamer } from '../UI/ColumnRenamer'
import { RenameContext } from '../../App'
import type { Tab, UploadResponse } from '../../types'
import type { useAnalysis } from '../../hooks/useAnalysis'

type AnalysisState = ReturnType<typeof useAnalysis>

interface Props {
  data:      UploadResponse
  file:      File | null
  analysis:  AnalysisState
  tab:       Tab
  filename:  string
  compact?:  boolean
  onRemove?: () => void
}

export function SlotContent({ data, file: _file, analysis, tab, filename, compact, onRemove }: Props) {
  const [renameMap, setRenameMap] = useState<Record<string, string>>({})

  return (
    <RenameContext.Provider value={renameMap}>
      <div className="space-y-3">
        {/* Slot header */}
        <div className={`glass flex items-center justify-between gap-2 ${compact ? 'px-3 py-2' : 'px-5 py-3'} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}
            aria-hidden="true" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0"
              style={{ boxShadow: '0 0 4px rgba(255,255,255,0.3)' }} />
            <span className="text-xs font-mono text-white/60 truncate">{filename}</span>
            <span className="text-[10px] font-mono text-white/25 border-l border-white/10 pl-2 flex-shrink-0">
              {data.shape[0].toLocaleString()} rows · {data.columns.length} cols
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!compact && <ColumnRenamer columns={data.columns} renameMap={renameMap} onChange={setRenameMap} />}
            {onRemove && (
              <button onClick={onRemove}
                className="text-xs font-mono text-white/25 hover:text-white/60 transition-colors"
                aria-label={`Remove ${filename}`}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        <AlertBanner data={data} />

        {/* Tab content */}
        <div className={compact ? 'text-[0.8rem]' : ''}>
          {tab === 'overview'      && <Overview data={data} renameMap={renameMap} />}
          {tab === 'trends'        && <Trends data={data} />}
          {tab === 'kpi'           && (
            <KPIAnalysis data={data} kpiResult={analysis.kpiResult}
              loading={analysis.kpiLoading} error={analysis.kpiError} onRun={analysis.runKpi} />
          )}
          {tab === 'distributions' && <Distributions data={data} />}
          {tab === 'correlations'  && (
            <Correlations correlations={analysis.corrResult} loading={analysis.corrLoading}
              corrError={analysis.corrError} onLoad={analysis.loadCorrelations} uploadData={data} />
          )}
          {tab === 'forecast'      && (
            <Forecast data={data} forecastResult={analysis.forecastResult}
              loading={analysis.forecastLoading} error={analysis.forecastError} onRun={analysis.runForecast} />
          )}
          {tab === 'segments'      && (
            <Segments data={data} segmentResult={analysis.segmentResult}
              loading={analysis.segmentLoading} error={analysis.segmentError} onRun={analysis.runSegment} />
          )}
          {tab === 'model'         && (
            <MLModel uploadData={data} onTrain={analysis.runTrain}
              result={analysis.trainResult} loading={analysis.trainLoading} error={analysis.trainError} />
          )}
          {tab === 'story'         && <Story data={data} corrResult={analysis.corrResult} />}
        </div>
      </div>
    </RenameContext.Provider>
  )
}
