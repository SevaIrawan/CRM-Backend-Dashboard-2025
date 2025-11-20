-- ============================================================
-- ADD TARGET MANAGEMENT PAGE TO PAGE VISIBILITY CONFIG
-- ============================================================
-- Purpose: Add USC Target Management page to page_visibility_config
-- Access: Manager USC, Executive, Admin only
-- ============================================================

-- Insert Target Management page
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES (
  '/usc/target-management',
  'Target Management',
  'USC',
  '["admin", "executive", "manager_usc"]'::jsonb
)
ON CONFLICT (page_path) 
DO UPDATE SET
  page_name = EXCLUDED.page_name,
  page_section = EXCLUDED.page_section,
  visible_for_roles = EXCLUDED.visible_for_roles,
  updated_at = NOW();

-- Verify insertion
SELECT 
  page_path,
  page_name,
  page_section,
  visible_for_roles,
  created_at,
  updated_at
FROM page_visibility_config
WHERE page_path = '/usc/target-management';

