-- ============================================================================
-- ADD SNR CUSTOMERS PAGES TO PAGE VISIBILITY CONFIG
-- ============================================================================
-- Purpose: Add SNR Customers pages to page_visibility_config table
-- Note: Access control will be set by admin via Page Status Management
-- Date: 2025-01-XX
-- ============================================================================

-- MYR SNR Customers
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES ('/myr/snr-customers', 'SNR Customers', 'MYR', '["admin"]'::jsonb)
ON CONFLICT (page_path) DO NOTHING;

-- SGD SNR Customers
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES ('/sgd/snr-customers', 'SNR Customers', 'SGD', '["admin"]'::jsonb)
ON CONFLICT (page_path) DO NOTHING;

-- USC SNR Customers
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES ('/usc/snr-customers', 'SNR Customers', 'USC', '["admin"]'::jsonb)
ON CONFLICT (page_path) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check if pages were added successfully
SELECT 
  page_path,
  page_name,
  page_section,
  visible_for_roles
FROM page_visibility_config
WHERE page_path LIKE '%/snr-customers'
ORDER BY page_section, page_path;

-- ============================================================================
-- NOTES
-- ============================================================================
-- Pages are added with default access: admin only
-- Admin can set access control via Page Status Management UI
-- To grant access to SNR roles, admin should:
-- 1. Go to Page Status Management
-- 2. Find SNR Customers page
-- 3. Check the appropriate SNR role (snr_myr, snr_sgd, snr_usc)

