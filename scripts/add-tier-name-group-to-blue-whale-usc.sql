-- ============================================================================
-- ADD TIER_NAME AND TIER_GROUP COLUMNS TO blue_whale_usc
-- ============================================================================
-- Purpose: Add tier_name and tier_group columns to blue_whale_usc
--          Sync from tier_usc_v1 (same pattern as tier column)
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD TIER_NAME COLUMN TO blue_whale_usc (IF NOT EXISTS)
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blue_whale_usc' AND column_name = 'tier_name'
  ) THEN
    ALTER TABLE blue_whale_usc ADD COLUMN tier_name VARCHAR(100);
    CREATE INDEX idx_blue_whale_usc_tier_name ON blue_whale_usc(tier_name);
    RAISE NOTICE 'Column tier_name added to blue_whale_usc';
  ELSE
    RAISE NOTICE 'Column tier_name already exists in blue_whale_usc';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: ADD TIER_GROUP COLUMN TO blue_whale_usc (IF NOT EXISTS)
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blue_whale_usc' AND column_name = 'tier_group'
  ) THEN
    ALTER TABLE blue_whale_usc ADD COLUMN tier_group VARCHAR(100);
    CREATE INDEX idx_blue_whale_usc_tier_group ON blue_whale_usc(tier_group);
    RAISE NOTICE 'Column tier_group added to blue_whale_usc';
  ELSE
    RAISE NOTICE 'Column tier_group already exists in blue_whale_usc';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: UPDATE FUNCTION sync_tier_to_blue_whale_usc
--         Sync 3 columns: tier, tier_name, tier_group
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_tier_to_blue_whale_usc(
  p_year INTEGER DEFAULT NULL,
  p_month VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE blue_whale_usc b
  SET 
    tier = t.tier,
    tier_name = t.tier_name,
    tier_group = t.tier_group
  FROM tier_usc_v1 t
  WHERE b.userkey = t.userkey
    AND b.year = t.year
    AND b.month = t.month
    AND t.tier IS NOT NULL
    AND (p_year IS NULL OR t.year = p_year)
    AND (p_month IS NULL OR t.month = p_month);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_tier_to_blue_whale_usc IS 'Copy tier, tier_name, and tier_group from tier_usc_v1 to blue_whale_usc master table';

-- ============================================================================
-- STEP 4: UPDATE TRIGGER FUNCTION auto_sync_tier_to_master
--         Sync 3 columns: tier, tier_name, tier_group
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_sync_tier_to_master()
RETURNS TRIGGER AS $$
BEGIN
  -- Hanya sync kalau tier NOT NULL (sudah di-calculate)
  IF NEW.tier IS NOT NULL THEN
    
    -- Update blue_whale_usc untuk semua records user ini di month ini
    -- Sync 3 columns sekaligus: tier, tier_name, tier_group
    UPDATE blue_whale_usc
    SET 
      tier = NEW.tier,
      tier_name = NEW.tier_name,
      tier_group = NEW.tier_group
    WHERE userkey = NEW.userkey
      AND year = NEW.year
      AND month = NEW.month
      AND currency = 'USC';
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: REFRESH DATA EXISTING (Sync all data from tier_usc_v1)
-- ============================================================================
-- Run this command to sync all existing tier data:
-- SELECT sync_tier_to_blue_whale_usc();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check columns added
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'blue_whale_usc' 
  AND column_name IN ('tier', 'tier_name', 'tier_group')
ORDER BY column_name;

-- Check sync status (sample)
SELECT 
  COUNT(*) as total_records,
  COUNT(tier) as tier_populated,
  COUNT(tier_name) as tier_name_populated,
  COUNT(tier_group) as tier_group_populated
FROM blue_whale_usc
WHERE currency = 'USC';

-- ============================================================================
-- DONE!
-- ============================================================================
-- 
-- Flow:
-- 1. API calculate tier → UPDATE tier_usc_v1 (tier, tier_name, tier_group)
-- 2. Trigger fired → AUTO UPDATE blue_whale_usc (tier, tier_name, tier_group) ✅
-- 
-- Manual refresh (if needed):
-- SELECT sync_tier_to_blue_whale_usc();  -- All data
-- SELECT sync_tier_to_blue_whale_usc(2025, 'November');  -- Specific month
-- ============================================================================

