-- ============================================================================
-- BULK ADD SNR USERS FOR USC MARKET
-- ============================================================================
-- Purpose: Bulk insert SNR Marketing users for USC market
-- Format: snr01_{line}, snr02_{line}, snr03_{line}, snr04_{line}, snr05_{line}
-- Each line will have 5 SNR accounts
-- Total: 14 lines × 5 accounts = 70 users
-- Date: 2025-01-XX
-- ============================================================================

-- Insert SNR users for USC market
INSERT INTO users (username, password, role, allowed_brands, created_at, updated_at) VALUES
-- SBKH Line (5 accounts)
('snr01_sbkh', 'snr123', 'snr_usc', ARRAY['SBKH'], NOW(), NOW()),
('snr02_sbkh', 'snr123', 'snr_usc', ARRAY['SBKH'], NOW(), NOW()),
('snr03_sbkh', 'snr123', 'snr_usc', ARRAY['SBKH'], NOW(), NOW()),
('snr04_sbkh', 'snr123', 'snr_usc', ARRAY['SBKH'], NOW(), NOW()),
('snr05_sbkh', 'snr123', 'snr_usc', ARRAY['SBKH'], NOW(), NOW()),

-- UWKH Line (5 accounts)
('snr01_uwkh', 'snr123', 'snr_usc', ARRAY['UWKH'], NOW(), NOW()),
('snr02_uwkh', 'snr123', 'snr_usc', ARRAY['UWKH'], NOW(), NOW()),
('snr03_uwkh', 'snr123', 'snr_usc', ARRAY['UWKH'], NOW(), NOW()),
('snr04_uwkh', 'snr123', 'snr_usc', ARRAY['UWKH'], NOW(), NOW()),
('snr05_uwkh', 'snr123', 'snr_usc', ARRAY['UWKH'], NOW(), NOW()),

-- LOY66 Line (5 accounts)
('snr01_loy66', 'snr123', 'snr_usc', ARRAY['LOY66'], NOW(), NOW()),
('snr02_loy66', 'snr123', 'snr_usc', ARRAY['LOY66'], NOW(), NOW()),
('snr03_loy66', 'snr123', 'snr_usc', ARRAY['LOY66'], NOW(), NOW()),
('snr04_loy66', 'snr123', 'snr_usc', ARRAY['LOY66'], NOW(), NOW()),
('snr05_loy66', 'snr123', 'snr_usc', ARRAY['LOY66'], NOW(), NOW()),

-- KH778 Line (5 accounts)
('snr01_kh778', 'snr123', 'snr_usc', ARRAY['KH778'], NOW(), NOW()),
('snr02_kh778', 'snr123', 'snr_usc', ARRAY['KH778'], NOW(), NOW()),
('snr03_kh778', 'snr123', 'snr_usc', ARRAY['KH778'], NOW(), NOW()),
('snr04_kh778', 'snr123', 'snr_usc', ARRAY['KH778'], NOW(), NOW()),
('snr05_kh778', 'snr123', 'snr_usc', ARRAY['KH778'], NOW(), NOW()),

-- KH888 Line (5 accounts)
('snr01_kh888', 'snr123', 'snr_usc', ARRAY['KH888'], NOW(), NOW()),
('snr02_kh888', 'snr123', 'snr_usc', ARRAY['KH888'], NOW(), NOW()),
('snr03_kh888', 'snr123', 'snr_usc', ARRAY['KH888'], NOW(), NOW()),
('snr04_kh888', 'snr123', 'snr_usc', ARRAY['KH888'], NOW(), NOW()),
('snr05_kh888', 'snr123', 'snr_usc', ARRAY['KH888'], NOW(), NOW()),

-- SBKH99 Line (5 accounts)
('snr01_sbkh99', 'snr123', 'snr_usc', ARRAY['SBKH99'], NOW(), NOW()),
('snr02_sbkh99', 'snr123', 'snr_usc', ARRAY['SBKH99'], NOW(), NOW()),
('snr03_sbkh99', 'snr123', 'snr_usc', ARRAY['SBKH99'], NOW(), NOW()),
('snr04_sbkh99', 'snr123', 'snr_usc', ARRAY['SBKH99'], NOW(), NOW()),
('snr05_sbkh99', 'snr123', 'snr_usc', ARRAY['SBKH99'], NOW(), NOW()),

-- 17WINKH Line (5 accounts)
('snr01_17winkh', 'snr123', 'snr_usc', ARRAY['17WINKH'], NOW(), NOW()),
('snr02_17winkh', 'snr123', 'snr_usc', ARRAY['17WINKH'], NOW(), NOW()),
('snr03_17winkh', 'snr123', 'snr_usc', ARRAY['17WINKH'], NOW(), NOW()),
('snr04_17winkh', 'snr123', 'snr_usc', ARRAY['17WINKH'], NOW(), NOW()),
('snr05_17winkh', 'snr123', 'snr_usc', ARRAY['17WINKH'], NOW(), NOW()),

-- 17WIN168 Line (5 accounts)
('snr01_17win168', 'snr123', 'snr_usc', ARRAY['17WIN168'], NOW(), NOW()),
('snr02_17win168', 'snr123', 'snr_usc', ARRAY['17WIN168'], NOW(), NOW()),
('snr03_17win168', 'snr123', 'snr_usc', ARRAY['17WIN168'], NOW(), NOW()),
('snr04_17win168', 'snr123', 'snr_usc', ARRAY['17WIN168'], NOW(), NOW()),
('snr05_17win168', 'snr123', 'snr_usc', ARRAY['17WIN168'], NOW(), NOW()),

-- OK888KH Line (5 accounts)
('snr01_ok888kh', 'snr123', 'snr_usc', ARRAY['OK888KH'], NOW(), NOW()),
('snr02_ok888kh', 'snr123', 'snr_usc', ARRAY['OK888KH'], NOW(), NOW()),
('snr03_ok888kh', 'snr123', 'snr_usc', ARRAY['OK888KH'], NOW(), NOW()),
('snr04_ok888kh', 'snr123', 'snr_usc', ARRAY['OK888KH'], NOW(), NOW()),
('snr05_ok888kh', 'snr123', 'snr_usc', ARRAY['OK888KH'], NOW(), NOW()),

-- OK188KH Line (5 accounts)
('snr01_ok188kh', 'snr123', 'snr_usc', ARRAY['OK188KH'], NOW(), NOW()),
('snr02_ok188kh', 'snr123', 'snr_usc', ARRAY['OK188KH'], NOW(), NOW()),
('snr03_ok188kh', 'snr123', 'snr_usc', ARRAY['OK188KH'], NOW(), NOW()),
('snr04_ok188kh', 'snr123', 'snr_usc', ARRAY['OK188KH'], NOW(), NOW()),
('snr05_ok188kh', 'snr123', 'snr_usc', ARRAY['OK188KH'], NOW(), NOW()),

-- Diamond887 Line (5 accounts)
('snr01_diamond887', 'snr123', 'snr_usc', ARRAY['Diamond887'], NOW(), NOW()),
('snr02_diamond887', 'snr123', 'snr_usc', ARRAY['Diamond887'], NOW(), NOW()),
('snr03_diamond887', 'snr123', 'snr_usc', ARRAY['Diamond887'], NOW(), NOW()),
('snr04_diamond887', 'snr123', 'snr_usc', ARRAY['Diamond887'], NOW(), NOW()),
('snr05_diamond887', 'snr123', 'snr_usc', ARRAY['Diamond887'], NOW(), NOW()),

-- CAM68 Line (5 accounts)
('snr01_cam68', 'snr123', 'snr_usc', ARRAY['CAM68'], NOW(), NOW()),
('snr02_cam68', 'snr123', 'snr_usc', ARRAY['CAM68'], NOW(), NOW()),
('snr03_cam68', 'snr123', 'snr_usc', ARRAY['CAM68'], NOW(), NOW()),
('snr04_cam68', 'snr123', 'snr_usc', ARRAY['CAM68'], NOW(), NOW()),
('snr05_cam68', 'snr123', 'snr_usc', ARRAY['CAM68'], NOW(), NOW()),

-- CAM78 Line (5 accounts)
('snr01_cam78', 'snr123', 'snr_usc', ARRAY['CAM78'], NOW(), NOW()),
('snr02_cam78', 'snr123', 'snr_usc', ARRAY['CAM78'], NOW(), NOW()),
('snr03_cam78', 'snr123', 'snr_usc', ARRAY['CAM78'], NOW(), NOW()),
('snr04_cam78', 'snr123', 'snr_usc', ARRAY['CAM78'], NOW(), NOW()),
('snr05_cam78', 'snr123', 'snr_usc', ARRAY['CAM78'], NOW(), NOW()),

-- HENG68KH Line (5 accounts)
('snr01_heng68kh', 'snr123', 'snr_usc', ARRAY['HENG68KH'], NOW(), NOW()),
('snr02_heng68kh', 'snr123', 'snr_usc', ARRAY['HENG68KH'], NOW(), NOW()),
('snr03_heng68kh', 'snr123', 'snr_usc', ARRAY['HENG68KH'], NOW(), NOW()),
('snr04_heng68kh', 'snr123', 'snr_usc', ARRAY['HENG68KH'], NOW(), NOW()),
('snr05_heng68kh', 'snr123', 'snr_usc', ARRAY['HENG68KH'], NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check total SNR USC users created
SELECT 
    COUNT(*) as total_snr_usc_users,
    COUNT(DISTINCT allowed_brands::text) as unique_brands
FROM users
WHERE role = 'snr_usc';

-- List all SNR USC users grouped by brand
SELECT 
    allowed_brands,
    COUNT(*) as account_count,
    STRING_AGG(username, ', ' ORDER BY username) as usernames
FROM users
WHERE role = 'snr_usc'
GROUP BY allowed_brands
ORDER BY allowed_brands;

-- List all SNR USC users (full details)
SELECT 
    id,
    username,
    role,
    allowed_brands,
    created_at
FROM users
WHERE role = 'snr_usc'
ORDER BY allowed_brands, username;

-- ============================================================================
-- NOTES
-- ============================================================================
-- Total users created: 70 users (14 lines × 5 accounts)
-- Default password: snr123 (users should change password after first login)
-- Role: snr_usc (SNR Marketing for USC market)
-- Each user is locked to their specific brand/line via allowed_brands
-- Username format: snr{01-05}_{line} (lowercase)
-- Brand format in allowed_brands: UPPERCASE (e.g., "SBKH", "UWKH")
-- 
-- Lines included:
-- 1. SBKH (5 accounts)
-- 2. UWKH (5 accounts)
-- 3. LOY66 (5 accounts)
-- 4. KH778 (5 accounts)
-- 5. KH888 (5 accounts)
-- 6. SBKH99 (5 accounts)
-- 7. 17WINKH (5 accounts)
-- 8. 17WIN168 (5 accounts)
-- 9. OK888KH (5 accounts)
-- 10. OK188KH (5 accounts)
-- 11. Diamond887 (5 accounts)
-- 12. CAM68 (5 accounts)
-- 13. CAM78 (5 accounts)
-- 14. HENG68KH (5 accounts)

