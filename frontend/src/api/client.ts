import axios, { AxiosError } from 'axios'
import type {
  UploadResponse,
  CorrelationResponse,
  KpiResponse,
  ForecastResponse,
  SegmentResponse,
  TrainResponse,
  InsightsResponse,
} from '../types'

const BASE = 'https://buisness-analysis.onrender.com'

const api = axios.create({ baseURL: BASE, timeout: 120_000 })

function extractError(e: unknown): string {
  if (e instanceof AxiosError) {
    const detail = e.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (e.response?.status === 0 || !e.response) return 'Cannot reach the server. Check your API URL.'
    return `Server error ${e.response.status}`
  }
  return String(e)
}

export async function pingServer(): Promise<void> {
  // Poll until the server actually responds (Render free tier cold-starts take 20-60s).
  // During cold-start, Render's proxy returns a 503 without CORS headers — the browser
  // shows a CORS error even though our backend has allow_origins=["*"].
  // We keep retrying so the loading bar stays visible until the server is genuinely ready.
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await api.get('/health')
      return                          // server responded — we're done
    } catch {
      if (attempt < 29) {
        await new Promise((r) => setTimeout(r, 3000))   // wait 3 s then retry
      }
    }
  }
  // All retries exhausted — let the app proceed anyway (server may be down)
}

export async function uploadCSV(file: File): Promise<UploadResponse> {
  try {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<UploadResponse>('/upload', form)
    return data
  } catch (e) {
    throw new Error(extractError(e))
  }
}

export async function fetchCorrelations(file: File): Promise<CorrelationResponse> {
  try {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<CorrelationResponse>('/correlations', form)
    return data
  } catch (e) {
    throw new Error(extractError(e))
  }
}

export async function fetchKpi(
  file: File,
  columns: string[],
  window: number = 3,
): Promise<KpiResponse> {
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('columns', columns.join(','))
    form.append('window', String(window))
    const { data } = await api.post<KpiResponse>('/kpi', form)
    return data
  } catch (e) {
    throw new Error(extractError(e))
  }
}

export async function fetchForecast(
  file: File,
  targetCol: string,
  periods: number = 12,
): Promise<ForecastResponse> {
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('target_col', targetCol)
    form.append('periods', String(periods))
    const { data } = await api.post<ForecastResponse>('/forecast', form)
    return data
  } catch (e) {
    throw new Error(extractError(e))
  }
}

export async function fetchSegments(
  file: File,
  columns: string[],
  nClusters: number = 0,
): Promise<SegmentResponse> {
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('columns', columns.join(','))
    form.append('n_clusters', String(nClusters))
    const { data } = await api.post<SegmentResponse>('/segment', form)
    return data
  } catch (e) {
    throw new Error(extractError(e))
  }
}

export async function trainModel(
  file: File,
  target: string,
  algorithm: string,
  testSize: number,
): Promise<TrainResponse> {
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('target', target)
    form.append('algorithm', algorithm)
    form.append('test_size', String(testSize / 100))
    const { data } = await api.post<TrainResponse>('/train', form)
    return data
  } catch (e) {
    throw new Error(extractError(e))
  }
}

export async function fetchInsights(file: File): Promise<InsightsResponse> {
  try {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<InsightsResponse>('/insights', form)
    return data
  } catch (e) {
    throw new Error(extractError(e))
  }
}
