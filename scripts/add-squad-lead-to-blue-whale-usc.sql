-- ============================================================================
-- ADD SQUAD_LEAD COLUMN TO blue_whale_usc TABLE
-- ============================================================================
-- Purpose: Add squad_lead column with auto-update logic
-- Date: 2025-11-21
-- 
-- Squad Lead Logic (Same as tier_usc_v1):
--   SquadLead A: SBKH, SBKH99, 17WINKH, 17WIN168
--   SquadLead B: OK188KH, OK888KH, CAM68, CAM78, KH888, KH778
--   SquadLead C: All other lines
-- 
-- Implementation:
--   1. Reuse existing get_squad_lead_from_line() function (if exists)
--   2. Add squad_lead column to blue_whale_usc
--   3. Create trigger to auto-update squad_lead on INSERT/UPDATE
--   4. Update existing records
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE/REUSE HELPER FUNCTION FOR SQUAD LEAD MAPPING
-- ============================================================================
-- This function makes it easy to update squad lead logic in the future
-- Just modify this function when line assignments change

CREATE OR REPLACE FUNCTION get_squad_lead_from_line(p_line VARCHAR(50))
RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN CASE
    -- SquadLead A
    WHEN p_line IN ('SBKH', 'SBKH99', '17WINKH', '17WIN168') THEN 'SquadLead A'
    -- SquadLead B
    WHEN p_line IN ('OK188KH', 'OK888KH', 'CAM68', 'CAM78', 'KH888', 'KH778') THEN 'SquadLead B'
    -- SquadLead C (default for all other lines)
    ELSE 'SquadLead C'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_squad_lead_from_line IS 'Map line to squad lead - Easy to update when line assignments change. Update this function to change squad lead assignments.';

-- ============================================================================
-- STEP 2: ADD SQUAD_LEAD COLUMN TO blue_whale_usc
-- ============================================================================

DO $$ 
BEGIN
  -- Add squad_lead column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blue_whale_usc' AND column_name = 'squad_lead'
  ) THEN
    ALTER TABLE blue_whale_usc ADD COLUMN squad_lead VARCHAR(50);
    RAISE NOTICE 'Column squad_lead added to blue_whale_usc';
  ELSE
    RAISE NOTICE 'Column squad_lead already exists in blue_whale_usc';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE TRIGGER FUNCTION TO AUTO-UPDATE squad_lead
-- ============================================================================
-- This trigger will automatically update squad_lead whenever a row is
-- inserted or updated, based on the line value

CREATE OR REPLACE FUNCTION update_squad_lead_blue_whale_usc()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-update squad_lead based on line
  NEW.squad_lead := get_squad_lead_from_line(NEW.line);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_squad_lead_blue_whale_usc IS 'Trigger function to auto-update squad_lead column based on line value';

-- ============================================================================
-- STEP 4: CREATE TRIGGER
-- ============================================================================

-- Drop trigger if exists (to allow re-running script)
DROP TRIGGER IF EXISTS trigger_update_squad_lead_blue_whale_usc ON blue_whale_usc;

-- Create trigger that fires BEFORE INSERT or UPDATE
CREATE TRIGGER trigger_update_squad_lead_blue_whale_usc
  BEFORE INSERT OR UPDATE OF line ON blue_whale_usc
  FOR EACH ROW
  EXECUTE FUNCTION update_squad_lead_blue_whale_usc();

COMMENT ON TRIGGER trigger_update_squad_lead_blue_whale_usc ON blue_whale_usc IS 'Auto-updates squad_lead column whenever line is inserted or updated';

-- ============================================================================
-- STEP 5: UPDATE EXISTING RECORDS
-- ============================================================================
-- Update all existing records to populate squad_lead column

UPDATE blue_whale_usc
SET squad_lead = get_squad_lead_from_line(line)
WHERE squad_lead IS NULL OR squad_lead != get_squad_lead_from_line(line);

-- Show update summary
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % records in blue_whale_usc with squad_lead values', v_updated_count;
END $$;

-- ============================================================================
-- STEP 6: CREATE INDEX FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_blue_whale_usc_squad_lead 
ON blue_whale_usc(squad_lead)
WHERE squad_lead IS NOT NULL;

COMMENT ON INDEX idx_blue_whale_usc_squad_lead IS 'Index on squad_lead for faster filtering and queries';

-- ============================================================================
-- STEP 7: VERIFICATION QUERIES
-- ============================================================================

-- Check squad_lead distribution
SELECT 
  squad_lead,
  COUNT(*) as record_count,
  COUNT(DISTINCT line) as distinct_lines,
  COUNT(DISTINCT userkey) as distinct_users,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM blue_whale_usc
WHERE squad_lead IS NOT NULL
GROUP BY squad_lead
ORDER BY squad_lead;

-- Check line to squad_lead mapping
SELECT 
  line,
  squad_lead,
  COUNT(*) as record_count
FROM blue_whale_usc
WHERE line IS NOT NULL AND squad_lead IS NOT NULL
GROUP BY line, squad_lead
ORDER BY line, squad_lead;

-- Check for any NULL squad_lead (should be 0 after update)
SELECT 
  COUNT(*) as null_squad_lead_count,
  COUNT(DISTINCT line) as distinct_lines_with_null
FROM blue_whale_usc
WHERE squad_lead IS NULL;

-- ============================================================================
-- MAINTENANCE GUIDE
-- ============================================================================
-- 
-- To update squad lead assignments in the future:
-- 
-- 1. Edit the get_squad_lead_from_line() function:
--    CREATE OR REPLACE FUNCTION get_squad_lead_from_line(p_line VARCHAR(50))
--    RETURNS VARCHAR(50) AS $$
--    BEGIN
--      RETURN CASE
--        WHEN p_line IN ('NEW_LINE_1', 'NEW_LINE_2') THEN 'SquadLead A'
--        WHEN p_line IN ('NEW_LINE_3', 'NEW_LINE_4') THEN 'SquadLead B'
--        ELSE 'SquadLead C'
--      END;
--    END;
--    $$ LANGUAGE plpgsql IMMUTABLE;
-- 
-- 2. Update existing records:
--    UPDATE blue_whale_usc
--    SET squad_lead = get_squad_lead_from_line(line)
--    WHERE squad_lead != get_squad_lead_from_line(line);
-- 
-- 3. New records will automatically get correct squad_lead via trigger
-- 
-- ============================================================================

