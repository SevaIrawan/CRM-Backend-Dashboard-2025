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
// ⚠️ IMPORTANT: Each tier MUST have a UNIQUE color to avoid ambiguity in charts
// Order: Highest to Lowest tier
// Color scheme: From lowest (Red) to highest (Green) - Visual progression
export const TIER_NAME_DEFINITIONS: TierDefinition[] = [
  // Main Tiers (7 tiers) - Ordered from Highest to Lowest
  { key: 'Super VIP', label: 'Super VIP', color: '#10B981' },  // Green - Highest tier
  { key: 'Tier 5', label: 'Tier 5', color: '#3B82F6' },        // Blue
  { key: 'Tier 4', label: 'Tier 4', color: '#8B5CF6' },        // Purple
  { key: 'Tier 3', label: 'Tier 3', color: '#6B7280' },        // Gray
  { key: 'Tier 2', label: 'Tier 2', color: '#FBBF24' },        // Yellow/Kuning
  { key: 'Tier 1', label: 'Tier 1', color: '#F59E0B' },        // Orange
  { key: 'Regular', label: 'Regular', color: '#EF4444' },      // Red/Merah - Lowest tier
  
  // Potential Tiers (3 tiers) - Each with DISTINCT colors
  { key: 'ND_P', label: 'ND_P', color: '#06B6D4' },            // Cyan/Sky Blue (distinct from blue)
  { key: 'P1', label: 'P1', color: '#EC4899' },                // Pink/Rose (distinct from red/purple)
  { key: 'P2', label: 'P2', color: '#84CC16' }                 // Lime Green (distinct from green)
]

export const TIER_NAME_COLORS: Record<string, string> = TIER_NAME_DEFINITIONS.reduce((acc, def) => {
  acc[def.key] = def.color
  return acc
}, {} as Record<string, string>)

// ✅ Validate: Ensure all tier colors are unique (no duplicates)
const colorUsage = new Map<string, string[]>()
TIER_NAME_DEFINITIONS.forEach(def => {
  if (!colorUsage.has(def.color)) {
    colorUsage.set(def.color, [])
  }
  colorUsage.get(def.color)!.push(def.key)
})

// Warn if duplicates found (development only)
if (process.env.NODE_ENV === 'development') {
  const duplicates = Array.from(colorUsage.entries()).filter(([_, tiers]) => tiers.length > 1)
  if (duplicates.length > 0) {
    console.warn('⚠️ [TIER COLORS] Duplicate colors found:', duplicates)
    duplicates.forEach(([color, tiers]) => {
      console.warn(`  Color ${color} used by: ${tiers.join(', ')}`)
    })
  } else {
    console.log('✅ [TIER COLORS] All tier colors are unique:', 
      TIER_NAME_DEFINITIONS.map(d => `${d.key}: ${d.color}`).join(', ')
    )
  }
}

