export interface BusinessContext {
  revenue_cols: string[]
  cost_cols:    string[]
  profit_cols:  string[]
  date_col:     string | null
  id_cols:      string[]
}

export interface TrendInfo {
  direction:    'up' | 'down' | 'flat'
  strength:     number
  monotonic_pct: number
}

export interface AnomalyInfo {
  count:   number
  pct:     number
  indices: number[]
}

export interface GrowthRate {
  mom: number | null
  yoy: number | null
}

export interface Recommendations {
  kpi:               string[]
  forecast:          string[]
  segments:          string[]
  distributions_num: string[]
  distributions_cat: string[]
  correlations:      string[]
  ml_targets:        string[]
  ml_default_target: string
}

export interface UploadResponse {
  shape:            [number, number]
  columns:          string[]
  dtypes:           Record<string, string>
  preview:          Record<string, unknown>[]
  sample:           Record<string, unknown>[]
  missing:          Record<string, number>
  missing_total:    number
  duplicates:       number
  complete_rows:    number
  memory_mb:        number
  numeric_cols:     string[]
  cat_cols:         string[]
  date_cols:        string[]
  statistics:       Record<string, Record<string, number | null>>
  cat_summary:      Record<string, Record<string, number>>
  business_context: BusinessContext
  trends:           Record<string, TrendInfo>
  health_score:     number
  anomalies:        Record<string, AnomalyInfo>
  growth_rates:     Record<string, GrowthRate>
  insights:         Record<string, string[]>
  recommendations:  Recommendations
}

export interface CorrelationResponse {
  original: { columns: string[]; matrix: (number | null)[][] }
  cleaned:  { columns: string[]; matrix: (number | null)[][] }
  pairs:    { feature1: string; feature2: string; correlation: number | null }[]
  error?:   string
}

export interface KpiColumnResult {
  values:     (number | null)[]
  moving_avg: (number | null)[]
  trend_line: (number | null)[]
  growth_pct: (number | null)[]
  mean:       number | null
  total:      number | null
  min:        number | null
  max:        number | null
}

export type KpiResponse = Record<string, KpiColumnResult>

export interface ForecastPoint {
  index:  number
  value:  number | null
  fitted?: number | null
}

export interface ForecastFuturePoint {
  index: number
  value: number | null
  lower: number | null
  upper: number | null
}

export interface ForecastResponse {
  target_col:   string
  historical:   ForecastPoint[]
  forecasted:   ForecastFuturePoint[]
  std_residual: number | null
}

export interface ClusterProfile {
  count: number
  pct:   number
  [key: string]: number | null
}

export interface SegmentResponse {
  n_clusters:   number
  labels:       number[]
  profiles:     Record<string, ClusterProfile>
  columns_used: string[]
  sample_data:  Record<string, unknown>[]
}

export interface TrainResponse {
  algorithm:             string
  problem_type:          'regression' | 'classification'
  train_samples:         number
  test_samples:          number
  features:              number
  metrics: {
    r2?:       number
    rmse?:     number
    mae?:      number
    accuracy?: number
  }
  actual_vs_predicted?:   { actual: number[]; predicted: number[] } | null
  classification_report?: Record<string, Record<string, number> | number> | null
  confusion_matrix?:      number[][] | null
  feature_importance?: {
    features:   string[]
    scores:     number[]
    cumulative: number[]
  } | null
  error?: string
}

export interface InsightsResponse {
  insights: string[]
}

export type Tab =
  | 'overview'
  | 'trends'
  | 'kpi'
  | 'distributions'
  | 'correlations'
  | 'forecast'
  | 'segments'
  | 'model'
  | 'story'
