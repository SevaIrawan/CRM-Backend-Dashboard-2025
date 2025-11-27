export interface ExcelTierDefinition {
  tier: number
  name: string
  group: string
  minScore: number
}

export interface ExcelPotentialTierDefinition {
  name: string
  minScore: number
}

export interface ExcelTierClassificationResult {
  tier: number
  tierName: string
  tierGroup: string
  potentialTier: string
}

export const EXCEL_STANDARD_TIER_DEFINITIONS: ExcelTierDefinition[] = [
  { tier: 1, name: 'Super VIP', group: 'High Value', minScore: 95 },
  { tier: 2, name: 'Tier 5', group: 'High Value', minScore: 75 },
  { tier: 3, name: 'Tier 4', group: 'Medium Value', minScore: 65 },
  { tier: 4, name: 'Tier 3', group: 'Medium Value', minScore: 40 },
  { tier: 5, name: 'Tier 2', group: 'Medium Value', minScore: 25 },
  { tier: 6, name: 'Tier 1', group: 'Low Value', minScore: 15 },
  { tier: 7, name: 'Regular', group: 'Low Value', minScore: 0 }
]

export const EXCEL_POTENTIAL_TIER_DEFINITIONS: ExcelPotentialTierDefinition[] = [
  { name: 'P2', minScore: 50 },
  { name: 'P1', minScore: 30 },
  { name: 'ND_P', minScore: 0 }
]

export function classifyExcelTier(
  totalScore: number,
  potentialScore: number
): ExcelTierClassificationResult {
  const tierDef =
    EXCEL_STANDARD_TIER_DEFINITIONS.find(def => totalScore >= def.minScore) ??
    EXCEL_STANDARD_TIER_DEFINITIONS[EXCEL_STANDARD_TIER_DEFINITIONS.length - 1]

  const potentialDef =
    EXCEL_POTENTIAL_TIER_DEFINITIONS.find(def => potentialScore >= def.minScore) ??
    EXCEL_POTENTIAL_TIER_DEFINITIONS[EXCEL_POTENTIAL_TIER_DEFINITIONS.length - 1]

  return {
    tier: tierDef.tier,
    tierName: tierDef.name,
    tierGroup: tierDef.group,
    potentialTier: potentialDef.name
  }
}

