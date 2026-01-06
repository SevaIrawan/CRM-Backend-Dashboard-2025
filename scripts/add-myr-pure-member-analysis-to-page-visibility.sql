-- ============================================================
-- ADD MYR PURE MEMBER ANALYSIS TO PAGE VISIBILITY CONFIG
-- ============================================================
-- Purpose: Register /myr/pure-member-analysis page to page_visibility_config
-- Date: 2025-01-XX
-- ============================================================

-- Insert MYR Pure Member Analysis page
-- Visible to all MYR roles (admin, executive, manager_myr, sq_myr)
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) 
VALUES 
('/myr/pure-member-analysis', 'Pure Member Analysis', 'MYR', '["admin", "executive", "manager_myr", "sq_myr"]')
ON CONFLICT (page_path) 
DO UPDATE SET
  page_name = EXCLUDED.page_name,
  page_section = EXCLUDED.page_section,
  visible_for_roles = EXCLUDED.visible_for_roles,
  updated_at = NOW();

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Check if page was added successfully
SELECT 
  page_path, 
  page_name, 
  page_section, 
  visible_for_roles,
  CASE 
    WHEN jsonb_array_length(visible_for_roles) > 1 THEN 'running'
    ELSE 'building'
  END as status
FROM page_visibility_config 
WHERE page_path = '/myr/pure-member-analysis';

-- ============================================================
-- NOTES
-- ============================================================
-- Status: 'running' (visible to multiple roles)
-- Visible to: admin, executive, manager_myr, sq_myr
-- ============================================================

