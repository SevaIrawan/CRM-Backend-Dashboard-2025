-- ============================================================================
-- AUTO-SYNC TIER TO MASTER TABLE
-- ============================================================================
-- Purpose: Auto-sync tier dari tier_usc_v1 ke blue_whale_usc
-- Trigger: Setiap UPDATE tier di tier_usc_v1
-- ============================================================================

-- Function untuk auto-sync
CREATE OR REPLACE FUNCTION auto_sync_tier_to_master()
RETURNS TRIGGER AS $$
BEGIN
  -- Hanya sync kalau tier NOT NULL (sudah di-calculate)
  IF NEW.tier IS NOT NULL THEN
    
    -- Update blue_whale_usc untuk semua records user ini di month ini
    UPDATE blue_whale_usc
    SET tier = NEW.tier
    WHERE userkey = NEW.userkey
      AND year = NEW.year
      AND month = NEW.month
      AND currency = 'USC';
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger lama kalau ada
DROP TRIGGER IF EXISTS trigger_auto_sync_tier ON tier_usc_v1;

-- Create trigger baru
CREATE TRIGGER trigger_auto_sync_tier
AFTER INSERT OR UPDATE ON tier_usc_v1
FOR EACH ROW
WHEN (NEW.tier IS NOT NULL)
EXECUTE FUNCTION auto_sync_tier_to_master();

-- ============================================================================
-- DONE! SEKARANG TIER AUTO-SYNC!
-- ============================================================================
-- 
-- Flow:
-- 1. API calculate tier → UPDATE tier_usc_v1.tier
-- 2. Trigger fired → AUTO UPDATE blue_whale_usc.tier ✅
-- 
-- No need manual sync function anymore!
-- ============================================================================

