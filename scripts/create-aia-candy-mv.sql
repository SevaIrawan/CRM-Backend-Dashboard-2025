-- ============================================
-- AIA CANDY TRACKING - MATERIALIZED VIEW
-- Single MV for ALL BRANDS (M24SG, M24MY, etc.)
-- Auto-detect brands dynamically
-- ============================================

-- Step 1: Create Materialized View
-- This MV will contain ALL brands and auto-detect new brands
CREATE MATERIALIZED VIEW "WhatsApp".aia_candy_daily_mv AS
SELECT 
    -- Date dimensions (for slicer & grouping)
    DATE(ctcr.timestamp) as date,
    TO_CHAR(DATE(ctcr.timestamp), 'MM-DD') as date_label,
    EXTRACT(MONTH FROM DATE(ctcr.timestamp)) as month_num,
    TO_CHAR(DATE(ctcr.timestamp), 'Month') as month_name,
    EXTRACT(YEAR FROM DATE(ctcr.timestamp)) as year,
    
    -- Brand dimension (DYNAMIC - auto-detect all brands)
    ctcr.brand,
    
    -- Group info
    gi.id as group_id,
    gi.group_name,
    SUBSTRING(gi.group_name FROM '^[A-Z]+') as brand_prefix,
    
    -- User info
    au.id as user_id,
    ctcr.username,
    
    -- Metrics
    ctcr.accumulated_candies,
    
    -- Flags for calculations
    CASE WHEN ctcr.accumulated_candies > 0 THEN 1 ELSE 0 END as has_interaction,
    
    -- Timestamps
    ctcr.timestamp as interaction_timestamp
    
FROM "WhatsApp".customer_total_candy_records ctcr
JOIN "WhatsApp".app_user au ON ctcr.username = au.username
JOIN "WhatsApp".user_group_map ugm ON au.id = ugm.user_id
JOIN "WhatsApp".group_info gi ON ugm.group_id = gi.id

WHERE ctcr.username NOT LIKE 'CS%'
AND ctcr.accumulated_candies > 0
AND ctcr.brand <> 'GKSG'
AND gi.group_name NOT LIKE 'GKSG%';


-- Step 2: Create Indexes for Performance
-- Index on date (for date range queries)
CREATE INDEX idx_aia_date ON "WhatsApp".aia_candy_daily_mv(date);

-- Index on brand (for brand filtering - CRITICAL!)
CREATE INDEX idx_aia_brand ON "WhatsApp".aia_candy_daily_mv(brand);

-- Index on year and month (for slicer filtering)
CREATE INDEX idx_aia_year_month ON "WhatsApp".aia_candy_daily_mv(year, month_num);

-- Composite index on brand + date (for most common query pattern)
CREATE INDEX idx_aia_brand_date ON "WhatsApp".aia_candy_daily_mv(brand, date);

-- Index on group_id (for group-level aggregations)
CREATE INDEX idx_aia_group ON "WhatsApp".aia_candy_daily_mv(group_id);


-- Step 3: Initial Refresh (Populate the MV)
REFRESH MATERIALIZED VIEW "WhatsApp".aia_candy_daily_mv;


-- Step 4: Setup Auto-Refresh with pg_cron
-- Refresh every hour at minute 0
SELECT cron.schedule(
    'refresh-aia-candy-mv',
    '0 * * * *',
    $$REFRESH MATERIALIZED VIEW CONCURRENTLY "WhatsApp".aia_candy_daily_mv$$
);


-- ============================================
-- VERIFICATION QUERIES
-- Run these after creating the MV
-- ============================================

-- Check total rows and basic stats
SELECT 
    'Total Rows' as metric, 
    COUNT(*)::text as value 
FROM "WhatsApp".aia_candy_daily_mv
UNION ALL
SELECT 
    'Unique Brands' as metric, 
    COUNT(DISTINCT brand)::text as value 
FROM "WhatsApp".aia_candy_daily_mv
UNION ALL
SELECT 
    'Date Range' as metric, 
    MIN(date)::text || ' to ' || MAX(date)::text as value 
FROM "WhatsApp".aia_candy_daily_mv;


-- Check brands breakdown
SELECT 
    brand, 
    COUNT(*) as total_records,
    COUNT(DISTINCT date) as total_days,
    MIN(date) as from_date, 
    MAX(date) as to_date,
    SUM(accumulated_candies) as total_candies
FROM "WhatsApp".aia_candy_daily_mv
GROUP BY brand
ORDER BY brand;


-- Check cron job is scheduled
SELECT * FROM cron.job WHERE jobname = 'refresh-aia-candy-mv';


-- ============================================
-- SAMPLE QUERIES (How to use the MV)
-- ============================================

-- Query for SGD brand (M24SG)
SELECT 
    date,
    date_label,
    COUNT(DISTINCT group_id) as groups_with_interaction,
    COUNT(DISTINCT username) as customer_trigger_count,
    SUM(accumulated_candies) as total_candies
FROM "WhatsApp".aia_candy_daily_mv
WHERE brand = 'M24SG'
AND year = 2024
AND month_num = 10
GROUP BY date, date_label
ORDER BY date;


-- Query for MYR brand (M24MY)
SELECT 
    date,
    date_label,
    COUNT(DISTINCT group_id) as groups_with_interaction,
    COUNT(DISTINCT username) as customer_trigger_count,
    SUM(accumulated_candies) as total_candies
FROM "WhatsApp".aia_candy_daily_mv
WHERE brand = 'M24MY'
AND year = 2024
AND month_num = 10
GROUP BY date, date_label
ORDER BY date;


-- ============================================
-- MAINTENANCE COMMANDS
-- ============================================

-- Manual refresh (if needed)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY "WhatsApp".aia_candy_daily_mv;

-- Drop cron job (if needed to reschedule)
-- SELECT cron.unschedule('refresh-aia-candy-mv');

-- Drop MV (if needed to recreate)
-- DROP MATERIALIZED VIEW IF EXISTS "WhatsApp".aia_candy_daily_mv CASCADE;

