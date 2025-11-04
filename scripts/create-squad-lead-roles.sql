-- =============================================
-- NEXMAX SQUAD LEAD ROLES SETUP SCRIPT
-- =============================================
-- Script untuk create Squad Lead roles dan users di Supabase
-- Jalankan script ini di SQL Editor Supabase
-- Date: 2025-11-03
-- =============================================

-- =============================================
-- STEP 1: Add allowed_brands column to users table
-- =============================================
-- Check if column already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'allowed_brands'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN allowed_brands TEXT[];
    
    RAISE NOTICE 'Column allowed_brands added to users table';
  ELSE
    RAISE NOTICE 'Column allowed_brands already exists';
  END IF;
END $$;

-- =============================================
-- STEP 2: Update existing users (set NULL for unrestricted access)
-- =============================================
-- NULL = access ALL brands (no restriction)
DO $$ 
BEGIN
  UPDATE users 
  SET allowed_brands = NULL 
  WHERE role IN ('admin', 'executive', 'manager_myr', 'manager_sgd', 'manager_usc', 
                 'sq_myr', 'sq_sgd', 'sq_usc', 'analyst', 'ops', 'demo');
  
  RAISE NOTICE 'Updated existing users with NULL allowed_brands (unrestricted access)';
END $$;

-- =============================================
-- STEP 3: Create Squad Lead USC accounts
-- =============================================

-- Squad Lead USC A - Handles: SBKH, SBKH99, 17WINKH, 17WIN168
INSERT INTO users (username, password, role, allowed_brands, created_at, updated_at) 
VALUES (
  'squad_lead_usc_a', 
  'squad_usc_a123', 
  'squad_lead', 
  ARRAY['SBKH', 'SBKH99', '17WINKH', '17WIN168'], 
  NOW(), 
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET 
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  allowed_brands = EXCLUDED.allowed_brands,
  updated_at = NOW();

-- Squad Lead USC B - Handles: OK188KH, OK888KH, CAM68, CAM78, KH888, KH778
INSERT INTO users (username, password, role, allowed_brands, created_at, updated_at) 
VALUES (
  'squad_lead_usc_b', 
  'squad_usc_b123', 
  'squad_lead', 
  ARRAY['OK188KH', 'OK888KH', 'CAM68', 'CAM78', 'KH888', 'KH778'], 
  NOW(), 
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET 
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  allowed_brands = EXCLUDED.allowed_brands,
  updated_at = NOW();

-- =============================================
-- STEP 4: Verify Squad Lead users
-- =============================================
SELECT 
  id,
  username,
  role,
  allowed_brands,
  created_at,
  updated_at
FROM users 
WHERE role = 'squad_lead'
ORDER BY username;

-- =============================================
-- STEP 5: Verify all users with allowed_brands info
-- =============================================
SELECT 
  username,
  role,
  allowed_brands,
  CASE 
    WHEN allowed_brands IS NULL THEN 'ALL BRANDS'
    ELSE array_to_string(allowed_brands, ', ')
  END as brand_access
FROM users 
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'executive' THEN 2
    WHEN 'manager_usc' THEN 3
    WHEN 'squad_lead' THEN 4
    WHEN 'sq_usc' THEN 5
    ELSE 99
  END,
  username;

-- =============================================
-- ROLE PERMISSIONS SUMMARY
-- =============================================
/*
SQUAD LEAD ROLES:

1. squad_lead_usc_a
   - Username: squad_lead_usc_a
   - Password: squad_usc_a123
   - Role: squad_lead (generic role for all markets)
   - Brands: SBKH, SBKH99, 17WINKH, 17WIN168 (USC market)
   - Permissions: Read-only, can access MYR/SGD/USC but only see their brands
   - Default Page: /usc/overview (auto-select first brand)

2. squad_lead_usc_b
   - Username: squad_lead_usc_b
   - Password: squad_usc_b123
   - Role: squad_lead (generic role for all markets)
   - Brands: OK188KH, OK888KH, CAM68, CAM78, KH888, KH778 (USC market)
   - Permissions: Read-only, can access MYR/SGD/USC but only see their brands
   - Default Page: /usc/overview (auto-select first brand)

KEY RULES:
- Role: 'squad_lead' (generic, not market-specific)
- Market access: Controlled by allowed_brands (e.g., USC brands = USC market access)
- Slicer "ALL" is DISABLED for Squad Lead users
- Slicer Line dropdown only shows THEIR assigned brands
- Can access: Overview, Business Performance, Member Report, Customer Retention, KPI Comparison, Brand Comparison
- Cannot edit targets (read-only)
- Page visibility controlled by Admin Page Status management
*/

