-- ============================================================================
-- UPDATE TIER NAMES IN tier_usc_v1 TABLE
-- ============================================================================
-- Purpose: Update tier_name in database to match new tier naming convention
-- 
-- New Tier Names:
--   Tier 1 = Super VIP (Tertinggi)
--   Tier 2 = Tier 5
--   Tier 3 = Tier 4
--   Tier 4 = Tier 3
--   Tier 5 = Tier 2
--   Tier 6 = Tier 1
--   Tier 7 = Regular (Terendah)
-- ============================================================================

BEGIN;

-- Update tier_name based on tier number
UPDATE tier_usc_v1
SET 
  tier_name = CASE tier
    WHEN 1 THEN 'Super VIP'
    WHEN 2 THEN 'Tier 5'
    WHEN 3 THEN 'Tier 4'
    WHEN 4 THEN 'Tier 3'
    WHEN 5 THEN 'Tier 2'
    WHEN 6 THEN 'Tier 1'
    WHEN 7 THEN 'Regular'
    ELSE tier_name
  END,
  updated_at = NOW()
WHERE tier IS NOT NULL;

-- Verify update
SELECT 
  tier,
  tier_name,
  COUNT(*) as count
FROM tier_usc_v1
WHERE tier IS NOT NULL
GROUP BY tier, tier_name
ORDER BY tier;

COMMIT;

