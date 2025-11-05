-- =====================================================
-- MIGRATION SCRIPT: Split Squad Lead Role into 3 Roles
-- =====================================================
-- Purpose: Migrate existing 'squad_lead' users to new market-specific roles
-- Date: 2025-11-05
-- Author: NEXMAX Development Team
-- =====================================================

-- STEP 1: Check current squad_lead users before migration
-- =====================================================
SELECT 
  id,
  username,
  role,
  allowed_brands,
  created_at
FROM users
WHERE role = 'squad_lead'
ORDER BY created_at DESC;

-- =====================================================
-- STEP 2: Migrate Squad Lead users to market-specific roles
-- =====================================================

-- 2A. Migrate MYR Squad Leads (brands ending with 'MY')
-- =====================================================
UPDATE users
SET role = 'squad_lead_myr'
WHERE role = 'squad_lead'
  AND allowed_brands IS NOT NULL
  AND (
    allowed_brands::text LIKE '%MY%' OR
    allowed_brands::text LIKE '%SBMY%' OR
    allowed_brands::text LIKE '%LVMY%' OR
    allowed_brands::text LIKE '%STMY%' OR
    allowed_brands::text LIKE '%JMMY%'
  );

-- 2B. Migrate SGD Squad Leads (brands ending with 'SG')
-- =====================================================
UPDATE users
SET role = 'squad_lead_sgd'
WHERE role = 'squad_lead'
  AND allowed_brands IS NOT NULL
  AND (
    allowed_brands::text LIKE '%SG%' OR
    allowed_brands::text LIKE '%SBSG%' OR
    allowed_brands::text LIKE '%LVSG%'
  );

-- 2C. Migrate USC Squad Leads (brands ending with 'KH' or Cambodia brands)
-- =====================================================
UPDATE users
SET role = 'squad_lead_usc'
WHERE role = 'squad_lead'
  AND allowed_brands IS NOT NULL
  AND (
    allowed_brands::text LIKE '%KH%' OR
    allowed_brands::text LIKE '%CAM%' OR
    allowed_brands::text LIKE '%WIN%' OR
    allowed_brands::text LIKE '%99%'
  );

-- =====================================================
-- STEP 3: Handle edge cases (if any squad_lead left unmigrated)
-- =====================================================

-- Check if any squad_lead users remain (should be 0)
SELECT 
  id,
  username,
  role,
  allowed_brands,
  'WARNING: Not migrated - manual review needed' as status
FROM users
WHERE role = 'squad_lead';

-- If any remain, default them to squad_lead_myr (safest fallback)
-- UNCOMMENT ONLY IF NEEDED:
-- UPDATE users
-- SET role = 'squad_lead_myr'
-- WHERE role = 'squad_lead';

-- =====================================================
-- STEP 4: Verify migration results
-- =====================================================

-- Count by new roles
SELECT 
  role,
  COUNT(*) as user_count,
  COUNT(DISTINCT allowed_brands) as unique_brand_sets
FROM users
WHERE role LIKE 'squad_lead_%'
GROUP BY role
ORDER BY role;

-- Show sample of migrated users
SELECT 
  id,
  username,
  role,
  allowed_brands,
  created_at
FROM users
WHERE role IN ('squad_lead_myr', 'squad_lead_sgd', 'squad_lead_usc')
ORDER BY role, created_at DESC
LIMIT 20;

-- =====================================================
-- STEP 5: Update any existing sessions (if needed)
-- =====================================================
-- NOTE: Users need to re-login to get new role
-- Or run session cleanup script to force re-authentication

-- =====================================================
-- ROLLBACK SCRIPT (USE ONLY IF NEEDED)
-- =====================================================
-- To rollback migration (restore to single squad_lead role):
-- 
-- UPDATE users
-- SET role = 'squad_lead'
-- WHERE role IN ('squad_lead_myr', 'squad_lead_sgd', 'squad_lead_usc');
-- 
-- =====================================================

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- Before migration: N users with role = 'squad_lead'
-- After migration:
--   - X users with role = 'squad_lead_myr' (MYR market brands)
--   - Y users with role = 'squad_lead_sgd' (SGD market brands)
--   - Z users with role = 'squad_lead_usc' (USC market brands)
--   - 0 users with role = 'squad_lead' (all migrated)
-- =====================================================

-- =====================================================
-- POST-MIGRATION CHECKLIST:
-- =====================================================
-- [ ] Verify all squad_lead users migrated (query STEP 3 returns 0)
-- [ ] Verify user counts match (query STEP 4)
-- [ ] Verify allowed_brands preserved correctly
-- [ ] Test login with migrated users
-- [ ] Verify sidebar shows correct market menus
-- [ ] Verify brand filtering works correctly
-- [ ] Update documentation with new role names
-- =====================================================

-- END OF MIGRATION SCRIPT

