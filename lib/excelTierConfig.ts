export type ExcelTierMetric = 'DA' | 'GGR' | 'PF' | 'ATV' | 'WIN_RATE'

export interface ExcelScorePoint {
  value: number
  score: number
}

export type ExcelZeroFallback = 'dash' | 'zero'

export interface ExcelMetricConfig {
  metric: ExcelTierMetric
  label: string
  points: ExcelScorePoint[]
  zeroFallback: ExcelZeroFallback
}

export interface ExcelModuleWeight {
  metric: ExcelTierMetric
  label: string
  weight: number
  enabled: boolean
}

export interface ExcelPotentialWeights {
  PF: number
  ATV: number
  WIN_RATE: number
}

// ---------------------------------------------------------------------------
// NOTE
// The point tables below are placeholders that illustrate the shape of the Excel
// Config (Config!Kx:Lx). Copy the exact rows from the Excel workbook into these
// arrays before running the new scoring logic in production so the values match
// the source spreadsheet 1:1.
// ---------------------------------------------------------------------------
const SAMPLE_DA_POINTS: ExcelScorePoint[] = [
  { value: 65, score: 5 },
  { value: 200, score: 10 },
  { value: 700, score: 25 },
  { value: 1500, score: 35 },
  { value: 6000, score: 50 },
  { value: 15000, score: 65 },
  { value: 30000, score: 80 },
  { value: 100000, score: 100 }
]

const SAMPLE_GGR_POINTS: ExcelScorePoint[] = [
  { value: 30, score: 5 },
  { value: 100, score: 10 },
  { value: 250, score: 25 },
  { value: 1000, score: 35 },
  { value: 4000, score: 50 },
  { value: 6500, score: 65 },
  { value: 16500, score: 80 },
  { value: 20000, score: 100 }
]

const SAMPLE_PF_POINTS: ExcelScorePoint[] = [
  { value: 3, score: 15 },
  { value: 6, score: 50 },
  { value: 12, score: 100 }
]

const SAMPLE_ATV_POINTS: ExcelScorePoint[] = [
  { value: 20, score: 15 },
  { value: 50, score: 50 },
  { value: 100, score: 100 }
]

const SAMPLE_WINRATE_POINTS: ExcelScorePoint[] = [
  { value: 15, score: 15 },
  { value: 30, score: 50 },
  { value: 50, score: 100 }
]

export const EXCEL_METRIC_CONFIGS: Record<ExcelTierMetric, ExcelMetricConfig> = {
  DA: {
    metric: 'DA',
    label: 'DA (Deposit Amount)',
    points: SAMPLE_DA_POINTS,
    zeroFallback: 'dash'
  },
  GGR: {
    metric: 'GGR',
    label: 'GGR (Gross Gaming Revenue)',
    points: SAMPLE_GGR_POINTS,
    zeroFallback: 'zero'
  },
  PF: {
    metric: 'PF',
    label: 'PF (Purchase Frequency)',
    points: SAMPLE_PF_POINTS,
    zeroFallback: 'dash'
  },
  ATV: {
    metric: 'ATV',
    label: 'ATV (Average Transaction Value)',
    points: SAMPLE_ATV_POINTS,
    zeroFallback: 'dash'
  },
  WIN_RATE: {
    metric: 'WIN_RATE',
    label: 'Win Rate',
    points: SAMPLE_WINRATE_POINTS,
    zeroFallback: 'zero'
  }
}

export const EXCEL_MODULE_WEIGHTS: ExcelModuleWeight[] = [
  { metric: 'DA', label: 'Deposit (DA)', weight: 0.3, enabled: true },
  { metric: 'GGR', label: 'GGR', weight: 0.4, enabled: true },
  { metric: 'PF', label: 'Purchase Frequency (PF)', weight: 0.15, enabled: true },
  { metric: 'ATV', label: 'Average Transaction Value (ATV)', weight: 0.15, enabled: true },
  { metric: 'WIN_RATE', label: 'Win Rate', weight: 0, enabled: false }
]

export const EXCEL_POTENTIAL_WEIGHTS: ExcelPotentialWeights = {
  PF: 0.25,
  ATV: 0.65,
  WIN_RATE: 0.1
}

