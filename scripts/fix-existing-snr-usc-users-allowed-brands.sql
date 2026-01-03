-- ============================================================================
-- FIX EXISTING SNR USC USERS ALLOWED_BRANDS
-- ============================================================================
-- Purpose: Update allowed_brands for existing SNR users based on their username
-- This script updates all SNR USC users with correct allowed_brands
-- Date: 2025-01-XX
-- ============================================================================

-- Update SBKH Line
UPDATE users SET allowed_brands = ARRAY['SBKH'] WHERE role = 'snr_usc' AND username IN ('snr01_sbkh', 'snr02_sbkh', 'snr03_sbkh', 'snr04_sbkh', 'snr05_sbkh');

-- Update UWKH Line
UPDATE users SET allowed_brands = ARRAY['UWKH'] WHERE role = 'snr_usc' AND username IN ('snr01_uwkh', 'snr02_uwkh', 'snr03_uwkh', 'snr04_uwkh', 'snr05_uwkh');

-- Update LOY66 Line
UPDATE users SET allowed_brands = ARRAY['LOY66'] WHERE role = 'snr_usc' AND username IN ('snr01_loy66', 'snr02_loy66', 'snr03_loy66', 'snr04_loy66', 'snr05_loy66');

-- Update KH778 Line
UPDATE users SET allowed_brands = ARRAY['KH778'] WHERE role = 'snr_usc' AND username IN ('snr01_kh778', 'snr02_kh778', 'snr03_kh778', 'snr04_kh778', 'snr05_kh778');

-- Update KH888 Line
UPDATE users SET allowed_brands = ARRAY['KH888'] WHERE role = 'snr_usc' AND username IN ('snr01_kh888', 'snr02_kh888', 'snr03_kh888', 'snr04_kh888', 'snr05_kh888');

-- Update SBKH99 Line
UPDATE users SET allowed_brands = ARRAY['SBKH99'] WHERE role = 'snr_usc' AND username IN ('snr01_sbkh99', 'snr02_sbkh99', 'snr03_sbkh99', 'snr04_sbkh99', 'snr05_sbkh99');

-- Update 17WINKH Line
UPDATE users SET allowed_brands = ARRAY['17WINKH'] WHERE role = 'snr_usc' AND username IN ('snr01_17winkh', 'snr02_17winkh', 'snr03_17winkh', 'snr04_17winkh', 'snr05_17winkh');

-- Update 17WIN168 Line
UPDATE users SET allowed_brands = ARRAY['17WIN168'] WHERE role = 'snr_usc' AND username IN ('snr01_17win168', 'snr02_17win168', 'snr03_17win168', 'snr04_17win168', 'snr05_17win168');

-- Update OK888KH Line
UPDATE users SET allowed_brands = ARRAY['OK888KH'] WHERE role = 'snr_usc' AND username IN ('snr01_ok888kh', 'snr02_ok888kh', 'snr03_ok888kh', 'snr04_ok888kh', 'snr05_ok888kh');

-- Update OK188KH Line
UPDATE users SET allowed_brands = ARRAY['OK188KH'] WHERE role = 'snr_usc' AND username IN ('snr01_ok188kh', 'snr02_ok188kh', 'snr03_ok188kh', 'snr04_ok188kh', 'snr05_ok188kh');

-- Update Diamond887 Line
UPDATE users SET allowed_brands = ARRAY['Diamond887'] WHERE role = 'snr_usc' AND username IN ('snr01_diamond887', 'snr02_diamond887', 'snr03_diamond887', 'snr04_diamond887', 'snr05_diamond887');

-- Update CAM68 Line
UPDATE users SET allowed_brands = ARRAY['CAM68'] WHERE role = 'snr_usc' AND username IN ('snr01_cam68', 'snr02_cam68', 'snr03_cam68', 'snr04_cam68', 'snr05_cam68');

-- Update CAM78 Line
UPDATE users SET allowed_brands = ARRAY['CAM78'] WHERE role = 'snr_usc' AND username IN ('snr01_cam78', 'snr02_cam78', 'snr03_cam78', 'snr04_cam78', 'snr05_cam78');

-- Update HENG68KH Line
UPDATE users SET allowed_brands = ARRAY['HENG68KH'] WHERE role = 'snr_usc' AND username IN ('snr01_heng68kh', 'snr02_heng68kh', 'snr03_heng68kh', 'snr04_heng68kh', 'snr05_heng68kh');

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check updated users
SELECT 
    username,
    role,
    allowed_brands,
    created_at
FROM users
WHERE role = 'snr_usc'
ORDER BY username;

-- Count by brand
SELECT 
    allowed_brands,
    COUNT(*) as user_count
FROM users
WHERE role = 'snr_usc'
  AND allowed_brands IS NOT NULL
GROUP BY allowed_brands
ORDER BY allowed_brands;

