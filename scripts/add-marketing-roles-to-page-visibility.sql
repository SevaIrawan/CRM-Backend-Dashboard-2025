-- ============================================================
-- ADD MARKETING ROLES TO PAGE VISIBILITY CONFIG
-- ============================================================
-- Purpose: Add marketing_usc, marketing_myr, marketing_sgd roles to page_visibility_config
-- Roles: marketing_usc, marketing_myr, marketing_sgd
-- Access: All Brand access for respective markets
-- ============================================================

-- ============================================================
-- UPDATE MYR PAGES - Add marketing_myr to all MYR pages
-- ============================================================

-- MYR - Overview pages (visible to marketing_myr)
UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_myr"]'::jsonb
WHERE page_path = '/myr/overview' 
  AND NOT (visible_for_roles @> '["marketing_myr"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_myr"]'::jsonb
WHERE page_path = '/myr/business-performance' 
  AND NOT (visible_for_roles @> '["marketing_myr"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_myr"]'::jsonb
WHERE page_path = '/myr/brand-performance-trends' 
  AND NOT (visible_for_roles @> '["marketing_myr"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_myr"]'::jsonb
WHERE page_path = '/myr/kpi-comparison' 
  AND NOT (visible_for_roles @> '["marketing_myr"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_myr"]'::jsonb
WHERE page_path = '/myr/overall-label' 
  AND NOT (visible_for_roles @> '["marketing_myr"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_myr"]'::jsonb
WHERE page_path = '/myr/aia-candy-tracking' 
  AND NOT (visible_for_roles @> '["marketing_myr"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_myr"]'::jsonb
WHERE page_path = '/myr/auto-approval-monitor' 
  AND NOT (visible_for_roles @> '["marketing_myr"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_myr"]'::jsonb
WHERE page_path = '/myr/auto-approval-withdraw' 
  AND NOT (visible_for_roles @> '["marketing_myr"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_myr"]'::jsonb
WHERE page_path = '/myr/customer-retention' 
  AND NOT (visible_for_roles @> '["marketing_myr"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_myr"]'::jsonb
WHERE page_path = '/myr/member-report' 
  AND NOT (visible_for_roles @> '["marketing_myr"]'::jsonb);

-- Check if pure-member-analysis exists for MYR
UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_myr"]'::jsonb
WHERE page_path = '/myr/pure-member-analysis' 
  AND NOT (visible_for_roles @> '["marketing_myr"]'::jsonb);

-- Check if customer-assignment exists for MYR
UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_myr"]'::jsonb
WHERE page_path = '/myr/customer-assignment' 
  AND NOT (visible_for_roles @> '["marketing_myr"]'::jsonb);

-- Check if snr-customers exists for MYR
UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_myr"]'::jsonb
WHERE page_path = '/myr/snr-customers' 
  AND NOT (visible_for_roles @> '["marketing_myr"]'::jsonb);

-- ============================================================
-- UPDATE SGD PAGES - Add marketing_sgd to all SGD pages
-- ============================================================

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_sgd"]'::jsonb
WHERE page_path = '/sgd/overview' 
  AND NOT (visible_for_roles @> '["marketing_sgd"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_sgd"]'::jsonb
WHERE page_path = '/sgd/business-performance' 
  AND NOT (visible_for_roles @> '["marketing_sgd"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_sgd"]'::jsonb
WHERE page_path = '/sgd/brand-performance-trends' 
  AND NOT (visible_for_roles @> '["marketing_sgd"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_sgd"]'::jsonb
WHERE page_path = '/sgd/kpi-comparison' 
  AND NOT (visible_for_roles @> '["marketing_sgd"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_sgd"]'::jsonb
WHERE page_path = '/sgd/aia-candy-tracking' 
  AND NOT (visible_for_roles @> '["marketing_sgd"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_sgd"]'::jsonb
WHERE page_path = '/sgd/auto-approval-monitor' 
  AND NOT (visible_for_roles @> '["marketing_sgd"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_sgd"]'::jsonb
WHERE page_path = '/sgd/customer-retention' 
  AND NOT (visible_for_roles @> '["marketing_sgd"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_sgd"]'::jsonb
WHERE page_path = '/sgd/member-report' 
  AND NOT (visible_for_roles @> '["marketing_sgd"]'::jsonb);

-- Check if pure-member-analysis exists for SGD
UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_sgd"]'::jsonb
WHERE page_path = '/sgd/pure-member-analysis' 
  AND NOT (visible_for_roles @> '["marketing_sgd"]'::jsonb);

-- Check if customer-assignment exists for SGD
UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_sgd"]'::jsonb
WHERE page_path = '/sgd/customer-assignment' 
  AND NOT (visible_for_roles @> '["marketing_sgd"]'::jsonb);

-- Check if snr-customers exists for SGD
UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_sgd"]'::jsonb
WHERE page_path = '/sgd/snr-customers' 
  AND NOT (visible_for_roles @> '["marketing_sgd"]'::jsonb);

-- ============================================================
-- UPDATE USC PAGES - Add marketing_usc to all USC pages
-- ============================================================

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_usc"]'::jsonb
WHERE page_path = '/usc/overview' 
  AND NOT (visible_for_roles @> '["marketing_usc"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_usc"]'::jsonb
WHERE page_path = '/usc/business-performance' 
  AND NOT (visible_for_roles @> '["marketing_usc"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_usc"]'::jsonb
WHERE page_path = '/usc/brand-performance-trends' 
  AND NOT (visible_for_roles @> '["marketing_usc"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_usc"]'::jsonb
WHERE page_path = '/usc/kpi-comparison' 
  AND NOT (visible_for_roles @> '["marketing_usc"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_usc"]'::jsonb
WHERE page_path = '/usc/auto-approval-monitor' 
  AND NOT (visible_for_roles @> '["marketing_usc"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_usc"]'::jsonb
WHERE page_path = '/usc/customer-retention' 
  AND NOT (visible_for_roles @> '["marketing_usc"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_usc"]'::jsonb
WHERE page_path = '/usc/member-report' 
  AND NOT (visible_for_roles @> '["marketing_usc"]'::jsonb);

UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_usc"]'::jsonb
WHERE page_path = '/usc/target-management' 
  AND NOT (visible_for_roles @> '["marketing_usc"]'::jsonb);

-- Check if pure-member-analysis exists for USC
UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_usc"]'::jsonb
WHERE page_path = '/usc/pure-member-analysis' 
  AND NOT (visible_for_roles @> '["marketing_usc"]'::jsonb);

-- Check if customer-assignment exists for USC
UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_usc"]'::jsonb
WHERE page_path = '/usc/customer-assignment' 
  AND NOT (visible_for_roles @> '["marketing_usc"]'::jsonb);

-- Check if snr-customers exists for USC
UPDATE page_visibility_config 
SET visible_for_roles = visible_for_roles || '["marketing_usc"]'::jsonb
WHERE page_path = '/usc/snr-customers' 
  AND NOT (visible_for_roles @> '["marketing_usc"]'::jsonb);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Count pages with marketing_usc
-- SELECT COUNT(*) as marketing_usc_pages
-- FROM page_visibility_config
-- WHERE visible_for_roles @> '["marketing_usc"]'::jsonb;

-- Count pages with marketing_myr
-- SELECT COUNT(*) as marketing_myr_pages
-- FROM page_visibility_config
-- WHERE visible_for_roles @> '["marketing_myr"]'::jsonb;

-- Count pages with marketing_sgd
-- SELECT COUNT(*) as marketing_sgd_pages
-- FROM page_visibility_config
-- WHERE visible_for_roles @> '["marketing_sgd"]'::jsonb;

-- View all pages with marketing roles
-- SELECT page_path, page_name, page_section, visible_for_roles
-- FROM page_visibility_config
-- WHERE visible_for_roles @> '["marketing_usc"]'::jsonb
--    OR visible_for_roles @> '["marketing_myr"]'::jsonb
--    OR visible_for_roles @> '["marketing_sgd"]'::jsonb
-- ORDER BY page_section, page_name;

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. Marketing roles have ALL BRAND access (allowedBrands: null)
-- 2. marketing_usc can access all USC pages (except admin-only pages)
-- 3. marketing_myr can access all MYR pages (except admin-only pages)
-- 4. marketing_sgd can access all SGD pages (except admin-only pages)
-- 5. Marketing roles are read-only (isReadOnly: true)
-- ============================================================
