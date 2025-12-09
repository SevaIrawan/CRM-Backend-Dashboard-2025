-- ============================================================================
-- REMOVE TIER MANAGEMENT FROM DATABASE
-- ============================================================================
-- Purpose: Remove Tier Management page from page_visibility_config table
-- ============================================================================

-- Delete Tier Management page from page_visibility_config
DELETE FROM page_visibility_config 
WHERE page_path = '/admin/tier-management';

-- Verify deletion
SELECT * FROM page_visibility_config 
WHERE page_path = '/admin/tier-management';

-- Should return 0 rows

