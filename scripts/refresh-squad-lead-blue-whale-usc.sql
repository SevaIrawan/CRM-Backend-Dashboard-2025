-- ============================================================================
-- REFRESH SQUAD_LEAD COLUMN IN blue_whale_usc TABLE
-- ============================================================================
-- Purpose: Refresh squad_lead column for all records in blue_whale_usc
-- Usage: Run this script whenever line assignments change or squad_lead needs refresh
-- 
-- Squad Lead Logic:
--   SquadLead A: SBKH, SBKH99, 17WINKH, 17WIN168
--   SquadLead B: OK188KH, OK888KH, CAM68, CAM78, KH888, KH778
--   SquadLead C: All other lines
-- ============================================================================

-- Ensure function exists (should already exist from initial setup)
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

-- ============================================================================
-- REFRESH SQUAD_LEAD FOR ALL RECORDS
-- ============================================================================

UPDATE blue_whale_usc
SET squad_lead = get_squad_lead_from_line(line)
WHERE squad_lead IS NULL 
   OR squad_lead != get_squad_lead_from_line(line);

-- Show update summary
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % records in blue_whale_usc with squad_lead values', v_updated_count;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
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
-- STATUS: READY TO EXECUTE
-- ============================================================================

