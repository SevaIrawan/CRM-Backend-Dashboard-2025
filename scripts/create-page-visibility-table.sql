-- ============================================================
-- PAGE VISIBILITY CONFIG TABLE
-- ============================================================
-- Purpose: Manage which pages are visible to which roles
-- Features: Real-time visibility control without deployment
-- ============================================================

-- Drop existing table if exists (for clean reinstall)
DROP TABLE IF EXISTS page_visibility_config;

-- Create table
CREATE TABLE page_visibility_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL UNIQUE, -- e.g., '/myr/overview'
  page_name TEXT NOT NULL, -- e.g., 'Overview'
  page_section TEXT NOT NULL, -- e.g., 'MYR', 'SGD', 'USC', 'Admin', 'Other'
  visible_for_roles JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of role names
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_page_visibility_section ON page_visibility_config(page_section);
CREATE INDEX idx_page_visibility_path ON page_visibility_config(page_path);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_page_visibility_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_page_visibility_timestamp
  BEFORE UPDATE ON page_visibility_config
  FOR EACH ROW
  EXECUTE FUNCTION update_page_visibility_timestamp();

-- ============================================================
-- SEED INITIAL DATA
-- ============================================================
-- Based on current Sidebar.tsx configuration
-- Hidden pages = empty visible_for_roles array
-- Visible pages = array of allowed roles
-- ============================================================

-- Dashboard (visible to all with dashboard permission)
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) VALUES
('/dashboard', 'Dashboard', 'Other', '["admin", "executive", "manager_myr", "manager_sgd", "manager_usc", "sq_myr", "sq_sgd", "sq_usc"]');

-- ============================================================
-- MYR PAGES (11 pages)
-- ============================================================

-- MYR - Visible to all MYR roles
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) VALUES
('/myr/overview', 'Overview', 'MYR', '["admin", "executive", "manager_myr", "sq_myr"]'),
('/myr/brand-performance-trends', 'Brand Comparison Trends', 'MYR', '["admin", "executive", "manager_myr", "sq_myr"]'),
('/myr/kpi-comparison', 'KPI Comparison', 'MYR', '["admin", "executive", "manager_myr", "sq_myr"]'),
('/myr/overall-label', 'Overall Label', 'MYR', '["admin", "executive", "manager_myr", "sq_myr"]'),
('/myr/aia-candy-tracking', 'AIA Candy Mechanism', 'MYR', '["admin", "executive", "manager_myr", "sq_myr"]'),
('/myr/auto-approval-monitor', 'Deposit Auto-Approval', 'MYR', '["admin", "executive", "manager_myr", "sq_myr"]'),
('/myr/auto-approval-withdraw', 'Withdrawal Auto-Approval', 'MYR', '["admin", "executive", "manager_myr", "sq_myr"]'),
('/myr/customer-retention', 'Customer Retention', 'MYR', '["admin", "executive", "manager_myr", "sq_myr"]'),
('/myr/member-report', 'Member Report', 'MYR', '["admin", "executive", "manager_myr", "sq_myr"]');

-- MYR - Hidden from non-admin roles (Building status)
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) VALUES
('/myr/member-analytic', 'Member Analytic', 'MYR', '["admin"]'),
('/myr/churn-member', 'Churned Members', 'MYR', '["admin"]');

-- ============================================================
-- SGD PAGES (8 pages)
-- ============================================================

-- SGD - Visible to all SGD roles
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) VALUES
('/sgd/overview', 'Overview', 'SGD', '["admin", "executive", "manager_sgd", "sq_sgd"]'),
('/sgd/brand-performance-trends', 'Brand Comparison Trends', 'SGD', '["admin", "executive", "manager_sgd", "sq_sgd"]'),
('/sgd/kpi-comparison', 'KPI Comparison', 'SGD', '["admin", "executive", "manager_sgd", "sq_sgd"]'),
('/sgd/auto-approval-monitor', 'Auto-Approval Monitor', 'SGD', '["admin", "executive", "manager_sgd", "sq_sgd"]'),
('/sgd/customer-retention', 'Customer Retention', 'SGD', '["admin", "executive", "manager_sgd", "sq_sgd"]'),
('/sgd/member-report', 'Member Report', 'SGD', '["admin", "executive", "manager_sgd", "sq_sgd"]');

-- SGD - Hidden from non-admin roles (Building status)
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) VALUES
('/sgd/member-analytic', 'Member Analytic', 'SGD', '["admin"]'),
('/sgd/churn-member', 'Churned Members', 'SGD', '["admin"]');

-- ============================================================
-- USC PAGES (8 pages)
-- ============================================================

-- USC - Visible to all USC roles
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) VALUES
('/usc/overview', 'Overview', 'USC', '["admin", "executive", "manager_usc", "sq_usc"]'),
('/usc/brand-performance-trends', 'Brand Comparison Trends', 'USC', '["admin", "executive", "manager_usc", "sq_usc"]'),
('/usc/kpi-comparison', 'KPI Comparison', 'USC', '["admin", "executive", "manager_usc", "sq_usc"]'),
('/usc/auto-approval-monitor', 'Auto-Approval Monitor', 'USC', '["admin", "executive", "manager_usc", "sq_usc"]'),
('/usc/customer-retention', 'Customer Retention', 'USC', '["admin", "executive", "manager_usc", "sq_usc"]'),
('/usc/member-report', 'Member Report', 'USC', '["admin", "executive", "manager_usc", "sq_usc"]');

-- USC - Manager, Executive, Admin only
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) VALUES
('/usc/target-management', 'Target Management', 'USC', '["admin", "executive", "manager_usc"]');

-- USC - Hidden from non-admin roles (Building status)
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) VALUES
('/usc/member-analytic', 'Member Analytic', 'USC', '["admin"]'),
('/usc/churn-member', 'Churned Members', 'USC', '["admin"]');

-- ============================================================
-- ADMIN & OTHER PAGES
-- ============================================================

-- Admin-only pages
INSERT INTO page_visibility_config (page_path, page_name, page_section, visible_for_roles) VALUES
('/users', 'User Management', 'Admin', '["admin"]'),
('/admin/activity-logs', 'Activity Logs', 'Admin', '["admin"]'),
('/admin/feedback', 'Feedback & Support', 'Admin', '["admin"]'),
('/admin/page-status', 'Page Status Management', 'Admin', '["admin"]'),
('/supabase', 'Supabase Connection', 'Other', '["admin"]');

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify the data:

-- Check total pages
-- SELECT COUNT(*) as total_pages FROM page_visibility_config;

-- Check pages by section
-- SELECT page_section, COUNT(*) as page_count 
-- FROM page_visibility_config 
-- GROUP BY page_section 
-- ORDER BY page_section;

-- Check Building pages (only admin can see)
-- SELECT page_path, page_name, page_section 
-- FROM page_visibility_config 
-- WHERE visible_for_roles = '["admin"]'::jsonb
-- ORDER BY page_section, page_name;

-- Check Running pages (multiple roles can access)
-- SELECT page_path, page_name, page_section, visible_for_roles 
-- FROM page_visibility_config 
-- WHERE jsonb_array_length(visible_for_roles) > 1
-- ORDER BY page_section, page_name;

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. Admin always sees all pages (by design)
-- 2. Building status = only admin in visible_for_roles
-- 3. Running status = multiple roles in visible_for_roles
-- 4. To hide page from all non-admin: SET visible_for_roles = '["admin"]'
-- 5. To show page to role: Add role to visible_for_roles array
-- ============================================================

