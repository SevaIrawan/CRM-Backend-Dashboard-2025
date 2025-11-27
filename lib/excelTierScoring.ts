import {
  EXCEL_METRIC_CONFIGS,
  EXCEL_MODULE_WEIGHTS,
  EXCEL_POTENTIAL_WEIGHTS,
  ExcelTierMetric,
  ExcelScorePoint,
  ExcelMetricConfig
} from '@/lib/excelTierConfig'

export interface ExcelMetricInputs {
  depositAmount: number
  ggr: number
  purchaseFrequency: number
  avgTransactionValue: number
  winRate: number
}

export interface ExcelMetricDetail {
  label: string
  value: number | null
  score: number | null
}

export interface ExcelScoringResult {
  totalScore: number
  potentialScore: number
  metricScores: Record<ExcelTierMetric, number>
  metricDetails: Record<ExcelTierMetric, ExcelMetricDetail>
}

const sortedPointsCache = new Map<ExcelTierMetric, ExcelScorePoint[]>()

function getSortedPoints(metric: ExcelTierMetric): ExcelScorePoint[] {
  if (sortedPointsCache.has(metric)) {
    return sortedPointsCache.get(metric)!
  }

  const rawPoints = EXCEL_METRIC_CONFIGS[metric]?.points ?? []
  const cleanPoints = rawPoints
    .filter(point => Number.isFinite(point.value) && Number.isFinite(point.score))
    .sort((a, b) => a.value - b.value)

  sortedPointsCache.set(metric, cleanPoints)
  return cleanPoints
}

function normalizeScore(value: number): number {
  return Math.round(value * 10000) / 10000
}

function clamp(value: number, minValue: number, maxValue: number): number {
  return Math.max(minValue, Math.min(maxValue, value))
}

function calculateMetricScore(
  metric: ExcelTierMetric,
  rawValue: number
): number | null {
  const config: ExcelMetricConfig | undefined = EXCEL_METRIC_CONFIGS[metric]

  if (!config) {
    return null
  }

  if (!Number.isFinite(rawValue)) {
    return null
  }

  if (rawValue <= 0) {
    return config.zeroFallback === 'zero' ? 0 : null
  }

  const points = getSortedPoints(metric)

  if (points.length === 0) {
    return 0
  }

  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]

  if (!Number.isFinite(firstPoint.value) || !Number.isFinite(firstPoint.score)) {
    return 0
  }

  const vMin = firstPoint.value
  const yMin = firstPoint.score
  const vMax = lastPoint.value
  const yMax = lastPoint.score

  if (rawValue <= vMin) {
    if (vMin <= 0) {
      return normalizeScore(yMin)
    }
    const base = Math.max(0.01, (rawValue / vMin) * yMin)
    return normalizeScore(base)
  }

  if (rawValue >= vMax) {
    return normalizeScore(yMax)
  }

  const pivotIndex = points.findIndex(point => point.value >= rawValue)
  const right = pivotIndex >= 0 ? points[pivotIndex] : lastPoint
  const left = pivotIndex > 0 ? points[pivotIndex - 1] : right

  if (right.value === left.value) {
    return normalizeScore(right.score)
  }

  const ratio = (rawValue - left.value) / (right.value - left.value)
  const interpolated = left.score + ratio * (right.score - left.score)
  return normalizeScore(interpolated)
}

function getMetricValue(metric: ExcelTierMetric, inputs: ExcelMetricInputs): number {
  switch (metric) {
    case 'DA':
      return inputs.depositAmount
    case 'GGR':
      return inputs.ggr
    case 'PF':
      return inputs.purchaseFrequency
    case 'ATV':
      return inputs.avgTransactionValue
    case 'WIN_RATE':
      return inputs.winRate
  }
}

export function calculateExcelTierScores(inputs: ExcelMetricInputs): ExcelScoringResult {
  const metricDetails = {} as Record<ExcelTierMetric, ExcelMetricDetail>

  EXCEL_MODULE_WEIGHTS.forEach(weight => {
    const rawValue = getMetricValue(weight.metric, inputs)
    const calculatedScore = calculateMetricScore(weight.metric, rawValue)
    metricDetails[weight.metric] = {
      label: EXCEL_METRIC_CONFIGS[weight.metric]?.label ?? weight.metric,
      value: Number.isFinite(rawValue) ? rawValue : null,
      score: calculatedScore
    }
  })

  const metricScores = {} as Record<ExcelTierMetric, number>
  Object.entries(metricDetails).forEach(([metricKey, detail]) => {
    metricScores[metricKey as ExcelTierMetric] = detail.score ?? 0
  })

  const totalScore = EXCEL_MODULE_WEIGHTS.reduce((sum, weight) => {
    if (!weight.enabled) {
      return sum
    }

    const score = metricScores[weight.metric] ?? 0
    return sum + score * weight.weight
  }, 0)

  const pfScore = metricScores.PF ?? 0
  const atvScore = metricScores.ATV ?? 0
  const winScore = metricScores.WIN_RATE ?? 0

  const winContribution = winScore === 0 ? -10 : winScore * EXCEL_POTENTIAL_WEIGHTS.WIN_RATE

  const rawPotential =
    pfScore * EXCEL_POTENTIAL_WEIGHTS.PF +
    atvScore * EXCEL_POTENTIAL_WEIGHTS.ATV +
    winContribution

  const potentialScore = clamp(rawPotential, 0, 100)

  return {
    totalScore: normalizeScore(totalScore),
    potentialScore: normalizeScore(potentialScore),
    metricScores,
    metricDetails
  }
}

