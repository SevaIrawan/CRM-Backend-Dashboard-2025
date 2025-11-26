export interface TierDefinition {
  key: string
  label: string
  color: string
}

export interface TierNameOption {
  name: string
  group?: string | null
}

// Tier Group Definitions (for backwards compatibility)
export const TIER_DEFINITIONS: TierDefinition[] = [
  { key: 'High Value', label: 'High Value', color: '#10B981' },
  { key: 'Medium Value', label: 'Medium Value', color: '#3B82F6' },
  { key: 'Potential', label: 'Potential', color: '#F97316' },
  { key: 'Low Value', label: 'Low Value', color: '#EF4444' }
]

export const ORDERED_TIER_GROUPS = TIER_DEFINITIONS.map(def => def.key)

export const TIER_GROUP_COLORS: Record<string, string> = TIER_DEFINITIONS.reduce((acc, def) => {
  acc[def.key] = def.color
  return acc
}, {} as Record<string, string>)

// Tier Name Definitions (for chart display)
export const TIER_NAME_DEFINITIONS: TierDefinition[] = [
  { key: 'Regular', label: 'Regular', color: '#6B7280' },    // Gray
  { key: 'Tier 1', label: 'Tier 1', color: '#10B981' },      // Green
  { key: 'Tier 2', label: 'Tier 2', color: '#3B82F6' },      // Blue
  { key: 'Tier 3', label: 'Tier 3', color: '#8B5CF6' },      // Purple
  { key: 'Tier 4', label: 'Tier 4', color: '#F59E0B' },      // Orange
  { key: 'Tier 5', label: 'Tier 5', color: '#EF4444' }       // Red
]

export const TIER_NAME_COLORS: Record<string, string> = TIER_NAME_DEFINITIONS.reduce((acc, def) => {
  acc[def.key] = def.color
  return acc
}, {} as Record<string, string>)

