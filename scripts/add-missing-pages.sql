-- ============================================================
-- ADD MISSING PAGES TO PAGE VISIBILITY CONFIG
-- ============================================================
-- This script adds pages that exist in the codebase but are missing from page_visibility_config
-- ============================================================

-- MYR Business Performance - Visible to all MYR roles
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES ('/myr/business-performance', 'Business Performance', 'MYR', '["admin", "executive", "manager_myr", "sq_myr"]')
ON CONFLICT (page_path) DO NOTHING;

-- SGD Business Performance - Visible to all SGD roles
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES ('/sgd/business-performance', 'Business Performance', 'SGD', '["admin", "executive", "manager_sgd", "sq_sgd"]')
ON CONFLICT (page_path) DO NOTHING;

-- SGD AIA Candy Mechanism - Visible to all SGD roles
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES ('/sgd/aia-candy-tracking', 'AIA Candy Mechanism', 'SGD', '["admin", "executive", "manager_sgd", "sq_sgd"]')
ON CONFLICT (page_path) DO NOTHING;

-- USC Business Performance - Visible to all USC roles
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES ('/usc/business-performance', 'Business Performance', 'USC', '["admin", "executive", "manager_usc", "sq_usc"]')
ON CONFLICT (page_path) DO NOTHING;

-- Admin Maintenance - Admin only
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES ('/admin/maintenance', 'Maintenance Mode', 'Admin', '["admin"]')
ON CONFLICT (page_path) DO NOTHING;

-- Admin Target Audit Log - Admin only
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES ('/admin/target-audit-log', 'Target Audit Log', 'Admin', '["admin"]')
ON CONFLICT (page_path) DO NOTHING;


-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run this to verify all pages are registered:
-- SELECT page_path, page_name, page_section, visible_for_roles 
-- FROM page_visibility_config 
-- ORDER BY page_section, page_name;

