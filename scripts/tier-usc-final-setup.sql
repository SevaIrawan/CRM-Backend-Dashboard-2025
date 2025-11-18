-- ============================================================================
-- USC TIER SYSTEM - FINAL SETUP (CLEAN VERSION)
-- ============================================================================
-- Architecture: REGULAR TABLE + API Calculation
-- Version: FINAL
-- Date: 2025-11-13
-- 
-- APPROACH:
-- 1. tier_usc_v1 = REGULAR TABLE (bisa di-UPDATE)
-- 2. Tier calculation = API (TypeScript K-Means)
-- 3. Sync tier to blue_whale_usc master table
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EVERYTHING OLD (TABLE, MV, VIEW, FUNCTIONS)
-- ============================================================================

-- Drop old table if exists (tier_usc_v1 is a TABLE, not MV)
DROP TABLE IF EXISTS tier_usc_v1 CASCADE;

-- Drop old materialized view if exists (in case it was created as MV before)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'tier_usc_v1') THEN
    DROP MATERIALIZED VIEW tier_usc_v1 CASCADE;
  END IF;
END $$;

-- Drop old view if exists
DROP VIEW IF EXISTS tier_usc_v1 CASCADE;

-- Drop old functions if exist (ALL POSSIBLE SIGNATURES!)
DROP FUNCTION IF EXISTS refresh_tier_usc_v1_data() CASCADE;
DROP FUNCTION IF EXISTS refresh_tier_usc_v1_data(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS refresh_tier_usc_v1_data(INTEGER, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS sync_tier_to_blue_whale_usc() CASCADE;
DROP FUNCTION IF EXISTS sync_tier_to_blue_whale_usc(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS sync_tier_to_blue_whale_usc(INTEGER, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS calculate_tier_kmeans() CASCADE;
DROP FUNCTION IF EXISTS calculate_tier_kmeans(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS calculate_tier_kmeans(INTEGER, VARCHAR) CASCADE;

-- Drop indexes if exist
DROP INDEX IF EXISTS idx_tier_usc_v1_userkey CASCADE;
DROP INDEX IF EXISTS idx_tier_usc_v1_unique_code CASCADE;
DROP INDEX IF EXISTS idx_tier_usc_v1_line CASCADE;
DROP INDEX IF EXISTS idx_tier_usc_v1_year_month CASCADE;
DROP INDEX IF EXISTS idx_tier_usc_v1_tier CASCADE;
DROP INDEX IF EXISTS idx_tier_usc_v1_tier_group CASCADE;
DROP INDEX IF EXISTS idx_tier_usc_v1_score CASCADE;

COMMIT;

-- ============================================================================
-- STEP 2: CREATE REGULAR TABLE (NOT MV!)
-- ============================================================================

CREATE TABLE tier_usc_v1 (
  -- Primary identifiers
  userkey VARCHAR(100) NOT NULL,
  unique_code VARCHAR(100),
  user_name VARCHAR(200),
  line VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  month VARCHAR(20) NOT NULL,
  
  -- Aggregated metrics
  total_deposit_amount DECIMAL(15,2) DEFAULT 0,
  total_ggr DECIMAL(15,2) DEFAULT 0,
  total_deposit_cases INTEGER DEFAULT 0,
  total_withdraw_amount DECIMAL(15,2) DEFAULT 0,
  total_withdraw_cases INTEGER DEFAULT 0,
  total_net_profit DECIMAL(15,2) DEFAULT 0,
  total_valid_amount DECIMAL(15,2) DEFAULT 0,
  total_bonus DECIMAL(15,2) DEFAULT 0,
  
  -- Derived metrics
  avg_transaction_value DECIMAL(15,2) DEFAULT 0,
  purchase_frequency INTEGER DEFAULT 0,
  win_rate DECIMAL(10,2) DEFAULT 0,
  active_days INTEGER DEFAULT 0,
  
  -- K-Means tier classification (WILL BE POPULATED BY API!)
  tier INTEGER,
  tier_name VARCHAR(50),
  tier_group VARCHAR(20),
  score DECIMAL(15,8),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  PRIMARY KEY (userkey, year, month),
  CHECK (tier IS NULL OR (tier >= 1 AND tier <= 7)),
  CHECK (tier_group IS NULL OR tier_group IN ('High Value', 'Medium Value', 'Low Value'))
);

-- ============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_tier_usc_v1_userkey ON tier_usc_v1(userkey);
CREATE INDEX idx_tier_usc_v1_unique_code ON tier_usc_v1(unique_code);
CREATE INDEX idx_tier_usc_v1_line ON tier_usc_v1(line);
CREATE INDEX idx_tier_usc_v1_year_month ON tier_usc_v1(year, month);
CREATE INDEX idx_tier_usc_v1_tier ON tier_usc_v1(tier);
CREATE INDEX idx_tier_usc_v1_tier_group ON tier_usc_v1(tier_group);
CREATE INDEX idx_tier_usc_v1_score ON tier_usc_v1(score DESC NULLS LAST);

-- ============================================================================
-- STEP 4: FUNCTION TO REFRESH DATA (Aggregate from blue_whale_usc)
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_tier_usc_v1_data(
  p_year INTEGER DEFAULT NULL,
  p_month VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_inserted_count INTEGER := 0;
BEGIN
  -- Use UPSERT to preserve existing tier data
  -- This will UPDATE metrics but PRESERVE tier if it already exists
  
  INSERT INTO tier_usc_v1 (
    userkey,
    unique_code,
    user_name,
    line,
    year,
    month,
    total_deposit_amount,
    total_ggr,
    total_deposit_cases,
    total_withdraw_amount,
    total_withdraw_cases,
    total_net_profit,
    total_valid_amount,
    total_bonus,
    avg_transaction_value,
    purchase_frequency,
    win_rate,
    active_days,
    tier,
    tier_name,
    tier_group,
    score
  )
  SELECT 
    userkey,
    MAX(unique_code) as unique_code,
    MAX(user_name) as user_name,
    SPLIT_PART(userkey, '-', 3) as line,
    year,
    month,
    
    -- Aggregated metrics
    SUM(deposit_amount) as total_deposit_amount,
    SUM(ggr) as total_ggr,
    SUM(deposit_cases) as total_deposit_cases,
    SUM(withdraw_amount) as total_withdraw_amount,
    SUM(withdraw_cases) as total_withdraw_cases,
    SUM(net_profit) as total_net_profit,
    SUM(valid_amount) as total_valid_amount,
    SUM(bonus) as total_bonus,
    
    -- Derived metrics
    CASE 
      WHEN SUM(deposit_cases) > 0 
      THEN SUM(deposit_amount) / SUM(deposit_cases)
      ELSE 0 
    END as avg_transaction_value,
    
    SUM(deposit_cases) as purchase_frequency,
    
    CASE 
      WHEN SUM(deposit_amount) > 0 
      THEN (SUM(ggr) / SUM(deposit_amount)) * 100
      ELSE 0 
    END as win_rate,
    
    COUNT(DISTINCT CASE WHEN deposit_cases > 0 THEN date END) as active_days,
    
    -- Tier columns = NULL (will be preserved on conflict if exists)
    NULL as tier,
    NULL as tier_name,
    NULL as tier_group,
    NULL as score
    
  FROM blue_whale_usc
  WHERE currency = 'USC'
    AND (p_year IS NULL OR year = p_year)
    AND (p_month IS NULL OR month = p_month)
  GROUP BY userkey, year, month
  HAVING SUM(deposit_cases) > 0
  
  ON CONFLICT (userkey, year, month) 
  DO UPDATE SET
    unique_code = EXCLUDED.unique_code,
    user_name = EXCLUDED.user_name,
    line = EXCLUDED.line,
    total_deposit_amount = EXCLUDED.total_deposit_amount,
    total_ggr = EXCLUDED.total_ggr,
    total_deposit_cases = EXCLUDED.total_deposit_cases,
    total_withdraw_amount = EXCLUDED.total_withdraw_amount,
    total_withdraw_cases = EXCLUDED.total_withdraw_cases,
    total_net_profit = EXCLUDED.total_net_profit,
    total_valid_amount = EXCLUDED.total_valid_amount,
    total_bonus = EXCLUDED.total_bonus,
    avg_transaction_value = EXCLUDED.avg_transaction_value,
    purchase_frequency = EXCLUDED.purchase_frequency,
    win_rate = EXCLUDED.win_rate,
    active_days = EXCLUDED.active_days,
    -- PRESERVE tier if it exists (don't overwrite with NULL)
    tier = COALESCE(tier_usc_v1.tier, EXCLUDED.tier),
    tier_name = COALESCE(tier_usc_v1.tier_name, EXCLUDED.tier_name),
    tier_group = COALESCE(tier_usc_v1.tier_group, EXCLUDED.tier_group),
    score = COALESCE(tier_usc_v1.score, EXCLUDED.score),
    updated_at = NOW();
  
  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  
  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: ADD TIER COLUMN TO blue_whale_usc (IF NOT EXISTS)
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blue_whale_usc' AND column_name = 'tier'
  ) THEN
    ALTER TABLE blue_whale_usc ADD COLUMN tier INTEGER;
    CREATE INDEX idx_blue_whale_usc_tier ON blue_whale_usc(tier);
  END IF;
END $$;

-- ============================================================================
-- STEP 6: FUNCTION TO SYNC TIER TO blue_whale_usc
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_tier_to_blue_whale_usc(
  p_year INTEGER DEFAULT NULL,
  p_month VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE blue_whale_usc b
  SET tier = t.tier
  FROM tier_usc_v1 t
  WHERE b.userkey = t.userkey
    AND b.year = t.year
    AND b.month = t.month
    AND t.tier IS NOT NULL
    AND (p_year IS NULL OR t.year = p_year)
    AND (p_month IS NULL OR t.month = p_month);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE tier_usc_v1 IS 'USC tier classification - REGULAR TABLE (not MV) - Tier calculated via API';
COMMENT ON COLUMN tier_usc_v1.tier IS 'K-Means tier 1-7 (calculated by API POST /api/calculate-tiers)';
COMMENT ON COLUMN tier_usc_v1.score IS 'K-Means weighted score (PF=32.1%, DA=29.8%, WinRate=19%, ATV=14.5%, GGR=4.3%)';
COMMENT ON FUNCTION refresh_tier_usc_v1_data IS 'Aggregate data from blue_whale_usc - Sets tier=NULL';
COMMENT ON FUNCTION sync_tier_to_blue_whale_usc IS 'Copy tier from tier_usc_v1 to blue_whale_usc master table';

-- ============================================================================
-- STEP 8: INITIAL DATA POPULATION
-- ============================================================================

SELECT refresh_tier_usc_v1_data();

-- ============================================================================
-- STEP 9: VERIFICATION QUERIES
-- ============================================================================

-- Check table created
SELECT 
  'tier_usc_v1' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT userkey) as unique_customers,
  COUNT(DISTINCT line) as brands,
  COUNT(CASE WHEN tier IS NULL THEN 1 END) as tier_null,
  COUNT(CASE WHEN tier IS NOT NULL THEN 1 END) as tier_assigned
FROM tier_usc_v1;

-- Check by period
SELECT 
  year,
  month,
  COUNT(*) as records,
  COUNT(DISTINCT userkey) as customers
FROM tier_usc_v1
GROUP BY year, month
ORDER BY year DESC, month DESC
LIMIT 10;

-- Check tier column in blue_whale_usc
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'blue_whale_usc' 
  AND column_name = 'tier';

-- ============================================================================
-- WORKFLOW SUMMARY
-- ============================================================================
-- 
-- DAILY MAINTENANCE:
-- 
-- STEP 1: Refresh data
--   SELECT refresh_tier_usc_v1_data();
-- 
-- STEP 2: Calculate tiers via API (TypeScript)
--   POST http://localhost:3000/api/usc-business-performance/calculate-tiers
-- 
-- STEP 3: Sync to master table
--   SELECT sync_tier_to_blue_whale_usc();
-- 
-- RESULT: tier_usc_v1.tier populated + blue_whale_usc.tier synced
-- 
-- ============================================================================
-- STATUS: ✅ READY FOR PRODUCTION
-- ============================================================================

