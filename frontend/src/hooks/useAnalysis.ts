import { useState } from 'react'
import {
  fetchKpi,
  fetchForecast,
  fetchSegments,
  trainModel,
  fetchCorrelations,
  fetchInsights,
} from '../api/client'
import type {
  KpiResponse,
  ForecastResponse,
  SegmentResponse,
  TrainResponse,
  CorrelationResponse,
  InsightsResponse,
} from '../types'

export function useAnalysis(file: File | null) {
  const [kpiResult,     setKpiResult]     = useState<KpiResponse | null>(null)
  const [kpiLoading,    setKpiLoading]    = useState(false)
  const [kpiError,      setKpiError]      = useState<string | null>(null)

  const [forecastResult,  setForecastResult]  = useState<ForecastResponse | null>(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [forecastError,   setForecastError]   = useState<string | null>(null)

  const [segmentResult,  setSegmentResult]  = useState<SegmentResponse | null>(null)
  const [segmentLoading, setSegmentLoading] = useState(false)
  const [segmentError,   setSegmentError]   = useState<string | null>(null)

  const [trainResult,  setTrainResult]  = useState<TrainResponse | null>(null)
  const [trainLoading, setTrainLoading] = useState(false)
  const [trainError,   setTrainError]   = useState<string | null>(null)

  const [corrResult,  setCorrResult]  = useState<CorrelationResponse | null>(null)
  const [corrLoading, setCorrLoading] = useState(false)
  const [corrError,   setCorrError]   = useState<string | null>(null)

  const [insightsResult,  setInsightsResult]  = useState<InsightsResponse | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError,   setInsightsError]   = useState<string | null>(null)

  async function runKpi(columns: string[], window: number) {
    if (!file) return
    setKpiLoading(true)
    setKpiError(null)
    try {
      const res = await fetchKpi(file, columns, window)
      setKpiResult(res)
    } catch (e) {
      setKpiError(e instanceof Error ? e.message : 'KPI analysis failed')
    } finally {
      setKpiLoading(false)
    }
  }

  async function runForecast(targetCol: string, periods: number) {
    if (!file) return
    setForecastLoading(true)
    setForecastError(null)
    try {
      const res = await fetchForecast(file, targetCol, periods)
      setForecastResult(res)
    } catch (e) {
      setForecastError(e instanceof Error ? e.message : 'Forecast failed')
    } finally {
      setForecastLoading(false)
    }
  }

  async function runSegment(columns: string[], nClusters: number) {
    if (!file) return
    setSegmentLoading(true)
    setSegmentError(null)
    try {
      const res = await fetchSegments(file, columns, nClusters)
      setSegmentResult(res)
    } catch (e) {
      setSegmentError(e instanceof Error ? e.message : 'Segmentation failed')
    } finally {
      setSegmentLoading(false)
    }
  }

  async function runTrain(target: string, algorithm: string, testSize: number) {
    if (!file) return
    setTrainLoading(true)
    setTrainError(null)
    try {
      const res = await trainModel(file, target, algorithm, testSize)
      setTrainResult(res)
    } catch (e) {
      setTrainError(e instanceof Error ? e.message : 'Training failed')
    } finally {
      setTrainLoading(false)
    }
  }

  async function loadCorrelations() {
    if (!file || corrLoading || corrResult) return
    setCorrLoading(true)
    setCorrError(null)
    try {
      const res = await fetchCorrelations(file)
      setCorrResult(res)
    } catch (e) {
      setCorrError(e instanceof Error ? e.message : 'Failed to load correlations')
    } finally {
      setCorrLoading(false)
    }
  }

  async function loadInsights() {
    if (!file || insightsLoading || insightsResult) return
    setInsightsLoading(true)
    setInsightsError(null)
    try {
      const res = await fetchInsights(file)
      setInsightsResult(res)
    } catch (e) {
      setInsightsError(e instanceof Error ? e.message : 'Failed to generate insights')
    } finally {
      setInsightsLoading(false)
    }
  }

  return {
    kpiResult,    kpiLoading,    kpiError,    runKpi,
    forecastResult, forecastLoading, forecastError, runForecast,
    segmentResult,  segmentLoading,  segmentError,  runSegment,
    trainResult,  trainLoading,  trainError,  runTrain,
    corrResult,   corrLoading,   corrError,   loadCorrelations,
    insightsResult, insightsLoading, insightsError, loadInsights,
  }
}
