-- ============================================================================
-- ADD CUSTOMER ASSIGNMENT PAGES TO PAGE VISIBILITY CONFIG
-- ============================================================================
-- Purpose: Add Customer Assignment pages to page_visibility_config table
-- Note: Access control will be set by admin via Page Status Management
-- Date: 2025-01-XX
-- ============================================================================

-- MYR Customer Assignment
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES ('/myr/customer-assignment', 'Customer Assignment', 'MYR', '["admin"]'::jsonb)
ON CONFLICT (page_path) DO NOTHING;

-- SGD Customer Assignment
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES ('/sgd/customer-assignment', 'Customer Assignment', 'SGD', '["admin"]'::jsonb)
ON CONFLICT (page_path) DO NOTHING;

-- USC Customer Assignment
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES ('/usc/customer-assignment', 'Customer Assignment', 'USC', '["admin"]'::jsonb)
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
WHERE page_path LIKE '%/customer-assignment'
ORDER BY page_section, page_path;

-- ============================================================================
-- NOTES
-- ============================================================================
-- Pages are added with default access: admin only
-- Admin can set access control via Page Status Management UI
-- To grant access to Manager and Squad Lead roles, admin should:
-- 1. Go to Page Status Management
-- 2. Find Customer Assignment page
-- 3. Check the appropriate roles (manager_myr, manager_sgd, manager_usc, squad_lead_myr, squad_lead_sgd, squad_lead_usc)

