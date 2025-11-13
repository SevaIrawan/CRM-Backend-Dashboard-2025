/**
 * ============================================================================
 * USC CUSTOMER TIER CLASSIFICATION - K-MEANS MODEL
 * ============================================================================
 * 
 * Purpose: Classify USC customers (per userkey per brand) into 7 tiers
 * Algorithm: K-Means clustering with Pure Data-Driven weights
 * Silhouette Score: 91.2% (Excellent clustering quality)
 * 
 * Level: Per userkey (customer per brand per month)
 * Source: MVP1 Segmentation Evaluation Report
 * 
 * ============================================================================
 */

// ============================================================================
// K-MEANS MODEL PARAMETERS (Pure Data-Driven)
// ============================================================================

/**
 * Feature weights from K-Means model
 * Source: usc_segmentation_artifacts.json (Pure Data-Driven)
 */
export const KMEANS_WEIGHTS = {
  DA: 0.2979662565631615,           // 29.8% - Deposit Amount
  GGR: 0.04327770914922594,         //  4.3% - Gross Gaming Revenue
  DC: 0.0,                          //  0.0% - Deposit Cases (excluded - redundant with PF)
  PF: 0.32071892742845315,          // 32.1% - Purchase Frequency (HIGHEST!)
  ATV: 0.14451388569617504,         // 14.5% - Average Transaction Value
  WinRate_smooth: 0.19352322116298434  // 19.4% - Win Rate
} as const

/**
 * Scaler center values (mean for standardization)
 */
export const SCALER_CENTER = {
  DA: 23.0,
  GGR: 10.0,
  DC: 4.0,
  PF: 0.07612326394634364,
  ATV: 5.0,
  WinRate_smooth: 0.0909090909090909
} as const

/**
 * Scaler scale values (standard deviation for standardization)
 */
export const SCALER_SCALE = {
  DA: 124.0,
  GGR: 40.0,
  DC: 18.0,
  PF: 0.25519832687977145,
  ATV: 3.7350503261358527,
  WinRate_smooth: 0.1339884393063584
} as const

// ============================================================================
// TIER DEFINITIONS
// ============================================================================

export const TIER_NAMES: Record<number, string> = {
  1: 'VIP Elite',
  2: 'VIP Premium',
  3: 'High Value',
  4: 'Standard',
  5: 'Regular',
  6: 'Low Activity',
  7: 'Dormant'
}

export const TIER_GROUPS: Record<number, string> = {
  1: 'High Value',
  2: 'High Value',
  3: 'Medium Value',
  4: 'Medium Value',
  5: 'Medium Value',
  6: 'Low Value',
  7: 'Low Value'
}

export const TIER_COLORS: Record<number, string> = {
  1: '#10b981', // Green
  2: '#3B82F6', // Blue
  3: '#06b6d4', // Cyan
  4: '#6366f1', // Indigo
  5: '#8b5cf6', // Purple
  6: '#f59e0b', // Orange
  7: '#ef4444'  // Red
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface CustomerMetrics {
  depositAmount: number
  ggr: number
  depositCases: number
  purchaseFrequency: number
  avgTransactionValue: number
  winRate: number  // In percentage (0-100)
}

export interface TierClassification {
  tier: number
  tierName: string
  tierGroup: string
  score: number
}

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate K-Means score for a customer
 * 
 * Process:
 * 1. Standardize each feature using z-score: (value - mean) / std_dev
 * 2. Apply K-Means weights to standardized features
 * 3. Sum weighted values to get final score
 * 
 * Higher score = Higher tier (better customer)
 */
export function calculateCustomerScore(metrics: CustomerMetrics): number {
  // Step 1: Standardize features (z-score normalization)
  const standardized = {
    DA: (metrics.depositAmount - SCALER_CENTER.DA) / SCALER_SCALE.DA,
    GGR: (metrics.ggr - SCALER_CENTER.GGR) / SCALER_SCALE.GGR,
    DC: (metrics.depositCases - SCALER_CENTER.DC) / SCALER_SCALE.DC,
    PF: (metrics.purchaseFrequency - SCALER_CENTER.PF) / SCALER_SCALE.PF,
    ATV: (metrics.avgTransactionValue - SCALER_CENTER.ATV) / SCALER_SCALE.ATV,
    WinRate_smooth: (metrics.winRate / 100 - SCALER_CENTER.WinRate_smooth) / SCALER_SCALE.WinRate_smooth
  }
  
  // Step 2: Apply K-Means weights
  const score = 
    (standardized.DA * KMEANS_WEIGHTS.DA) +
    (standardized.GGR * KMEANS_WEIGHTS.GGR) +
    (standardized.DC * KMEANS_WEIGHTS.DC) +
    (standardized.PF * KMEANS_WEIGHTS.PF) +
    (standardized.ATV * KMEANS_WEIGHTS.ATV) +
    (standardized.WinRate_smooth * KMEANS_WEIGHTS.WinRate_smooth)
  
  return score
}

/**
 * Assign tier based on score percentiles
 * 
 * NOTE: These boundaries will be AUTO-CALIBRATED based on actual score distribution
 * This is a PLACEHOLDER - will be updated after analyzing real data distribution
 */
export function assignTierFromScore(score: number): number {
  // These thresholds should be calibrated from actual data
  // Current values are ESTIMATES and will be adjusted
  if (score >= 2.5) return 1   // Top ~5%
  if (score >= 1.8) return 2   // Next ~10%
  if (score >= 1.0) return 3   // Next ~15%
  if (score >= 0.3) return 4   // Next ~25%
  if (score >= -0.3) return 5  // Next ~25%
  if (score >= -1.0) return 6  // Next ~15%
  return 7                     // Bottom ~5%
}

/**
 * AUTO-CALIBRATE tier boundaries based on score distribution
 * Uses percentile-based approach for fair distribution
 * 
 * @param scores - Array of all customer scores
 * @returns Tier boundaries optimized for this dataset
 */
export function calibrateTierBoundaries(scores: number[]): {
  tier: number
  minScore: number
  maxScore: number
  count: number
  percentage: number
}[] {
  const sorted = [...scores].sort((a, b) => b - a) // Descending
  const total = sorted.length
  
  // Target distribution (based on business rules)
  const tierDistribution = [
    { tier: 1, targetPct: 0.05 },  // Top 5% - VIP Elite
    { tier: 2, targetPct: 0.10 },  // Next 10% - VIP Premium
    { tier: 3, targetPct: 0.15 },  // Next 15% - High Value
    { tier: 4, targetPct: 0.25 },  // Next 25% - Standard
    { tier: 5, targetPct: 0.25 },  // Next 25% - Regular
    { tier: 6, targetPct: 0.15 },  // Next 15% - Low Activity
    { tier: 7, targetPct: 0.05 }   // Bottom 5% - Dormant
  ]
  
  const boundaries = []
  let cumulativeIndex = 0
  
  for (const { tier, targetPct } of tierDistribution) {
    const count = Math.floor(total * targetPct)
    const startIndex = cumulativeIndex
    const endIndex = Math.min(cumulativeIndex + count - 1, total - 1)
    
    boundaries.push({
      tier,
      minScore: sorted[endIndex] || sorted[total - 1],
      maxScore: sorted[startIndex] || sorted[0],
      count,
      percentage: (count / total) * 100
    })
    
    cumulativeIndex += count
  }
  
  return boundaries
}

/**
 * Assign tier using calibrated boundaries
 */
export function assignTierWithBoundaries(
  score: number, 
  boundaries: ReturnType<typeof calibrateTierBoundaries>
): number {
  for (const boundary of boundaries) {
    if (score >= boundary.minScore) {
      return boundary.tier
    }
  }
  return 7 // Default to lowest tier
}

/**
 * Get tier classification info
 */
export function getTierClassification(tier: number): TierClassification {
  return {
    tier,
    tierName: TIER_NAMES[tier] || 'Unknown',
    tierGroup: TIER_GROUPS[tier] || 'Unknown',
    score: 0 // Score will be calculated separately
  }
}

/**
 * Get tier color for UI
 */
export function getTierColor(tier: number): string {
  return TIER_COLORS[tier] || '#6b7280'
}

/**
 * Get tier badge style for UI
 */
export function getTierBadge(tier: number): { bg: string, text: string, label: string } {
  const color = TIER_COLORS[tier]
  
  if (tier <= 2) {
    return { bg: '#D1FAE5', text: '#059669', label: TIER_NAMES[tier] }
  }
  if (tier <= 5) {
    return { bg: '#DBEAFE', text: '#3B82F6', label: TIER_NAMES[tier] }
  }
  return { bg: '#FEE2E2', text: '#dc2626', label: TIER_NAMES[tier] }
}

// ============================================================================
// TIER MOVEMENT TRACKING
// ============================================================================

export type TierMovementType = 'UPGRADE' | 'DOWNGRADE' | 'STABLE' | 'NEW' | 'CHURNED'

export interface TierMovement {
  userkey: string
  uniqueCode: string
  line: string
  movementType: TierMovementType
  fromTier: number | null
  toTier: number | null
  tierChange: number  // Positive = upgrade, Negative = downgrade
  scoreChange: number
}

/**
 * Calculate tier movement between two periods
 */
export function calculateTierMovement(
  currentPeriod: Array<{ userkey: string, uniqueCode: string, line: string, tier: number, score: number }>,
  previousPeriod: Array<{ userkey: string, uniqueCode: string, line: string, tier: number, score: number }>
): TierMovement[] {
  const movements: TierMovement[] = []
  const prevMap = new Map(previousPeriod.map(p => [`${p.userkey}_${p.line}`, p]))
  
  currentPeriod.forEach(current => {
    const key = `${current.userkey}_${current.line}`
    const previous = prevMap.get(key)
    
    if (!previous) {
      // NEW customer in current period
      movements.push({
        userkey: current.userkey,
        uniqueCode: current.uniqueCode,
        line: current.line,
        movementType: 'NEW',
        fromTier: null,
        toTier: current.tier,
        tierChange: 0,
        scoreChange: 0
      })
    } else {
      const tierChange = previous.tier - current.tier // Positive = upgrade (tier decreased)
      const scoreChange = current.score - previous.score
      
      let movementType: TierMovementType = 'STABLE'
      
      if (tierChange > 0) {
        movementType = 'UPGRADE'
      } else if (tierChange < 0) {
        movementType = 'DOWNGRADE'
      }
      
      movements.push({
        userkey: current.userkey,
        uniqueCode: current.uniqueCode,
        line: current.line,
        movementType,
        fromTier: previous.tier,
        toTier: current.tier,
        tierChange,
        scoreChange
      })
      
      // Remove from prevMap
      prevMap.delete(key)
    }
  })
  
  // Remaining in prevMap = CHURNED (not in current period)
  prevMap.forEach(previous => {
    movements.push({
      userkey: previous.userkey,
      uniqueCode: previous.uniqueCode,
      line: previous.line,
      movementType: 'CHURNED',
      fromTier: previous.tier,
      toTier: null,
      tierChange: 0,
      scoreChange: 0
    })
  })
  
  return movements
}

/**
 * Get tier movement summary statistics
 */
export function getTierMovementSummary(movements: TierMovement[]): {
  totalUpgrades: number
  totalDowngrades: number
  totalStable: number
  totalNew: number
  totalChurned: number
  upgradesByTier: Record<number, number>  // To Tier
  downgradesByTier: Record<number, number>  // To Tier
} {
  const summary = {
    totalUpgrades: 0,
    totalDowngrades: 0,
    totalStable: 0,
    totalNew: 0,
    totalChurned: 0,
    upgradesByTier: {} as Record<number, number>,
    downgradesByTier: {} as Record<number, number>
  }
  
  movements.forEach(m => {
    switch (m.movementType) {
      case 'UPGRADE':
        summary.totalUpgrades++
        if (m.toTier) {
          summary.upgradesByTier[m.toTier] = (summary.upgradesByTier[m.toTier] || 0) + 1
        }
        break
      case 'DOWNGRADE':
        summary.totalDowngrades++
        if (m.toTier) {
          summary.downgradesByTier[m.toTier] = (summary.downgradesByTier[m.toTier] || 0) + 1
        }
        break
      case 'STABLE':
        summary.totalStable++
        break
      case 'NEW':
        summary.totalNew++
        break
      case 'CHURNED':
        summary.totalChurned++
        break
    }
  })
  
  return summary
}

// ============================================================================
// EXPORT MODEL INFO
// ============================================================================

export function getModelInfo() {
  return {
    algorithm: 'K-Means Clustering',
    version: 'v1',
    source: 'Pure Data-Driven',
    k: 7,
    silhouetteScore: 0.912,
    weights: {
      DA: '29.8%',
      PF: '32.1%',
      ATV: '14.5%',
      WinRate: '19.4%',
      GGR: '4.3%',
      DC: '0%'
    },
    keyInsights: {
      mostImportant: 'PF (Purchase Frequency) - 32.1%',
      leastImportant: 'DC (Deposit Cases) - 0% (excluded)',
      overlap: 'GGR has low weight (4.3%) due to overlap with DA and ATV'
    }
  }
}

