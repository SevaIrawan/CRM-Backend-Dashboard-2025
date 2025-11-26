-- ============================================================================
-- ADD COLUMNS TO tier_usc_v1 TABLE
-- ============================================================================
-- Purpose: Add squad_lead, traffic, first_deposit_date, first_deposit_amount columns
-- Date: 2025-11-21
-- 
-- Squad Lead Logic:
--   SquadLead A: SBKH, SBKH99, 17WINKH, 17WIN168
--   SquadLead B: OK188KH, OK888KH, CAM68, CAM78, KH888, KH778
--   SquadLead C: All other lines
-- 
-- Additional Columns:
--   traffic: MAX(traffic) per userkey (from blue_whale_usc)
--   first_deposit_date: first_deposit_date if exists, else MIN(date) per userkey (fallback to first transaction date)
--   first_deposit_amount: first_deposit_amount if exists, else deposit_amount on that date per userkey (fallback to first transaction amount)
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD COLUMNS TO tier_usc_v1
-- ============================================================================

DO $$ 
BEGIN
  -- Add squad_lead column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tier_usc_v1' AND column_name = 'squad_lead'
  ) THEN
    ALTER TABLE tier_usc_v1 ADD COLUMN squad_lead VARCHAR(50);
    RAISE NOTICE 'Column squad_lead added to tier_usc_v1';
  ELSE
    RAISE NOTICE 'Column squad_lead already exists in tier_usc_v1';
  END IF;
  
  -- Add traffic column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tier_usc_v1' AND column_name = 'traffic'
  ) THEN
    ALTER TABLE tier_usc_v1 ADD COLUMN traffic VARCHAR(100);
    RAISE NOTICE 'Column traffic added to tier_usc_v1';
  ELSE
    RAISE NOTICE 'Column traffic already exists in tier_usc_v1';
  END IF;
  
  -- Add first_deposit_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tier_usc_v1' AND column_name = 'first_deposit_date'
  ) THEN
    ALTER TABLE tier_usc_v1 ADD COLUMN first_deposit_date DATE;
    RAISE NOTICE 'Column first_deposit_date added to tier_usc_v1';
  ELSE
    RAISE NOTICE 'Column first_deposit_date already exists in tier_usc_v1';
  END IF;
  
  -- Add first_deposit_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tier_usc_v1' AND column_name = 'first_deposit_amount'
  ) THEN
    ALTER TABLE tier_usc_v1 ADD COLUMN first_deposit_amount DECIMAL(15,2);
    RAISE NOTICE 'Column first_deposit_amount added to tier_usc_v1';
  ELSE
    RAISE NOTICE 'Column first_deposit_amount already exists in tier_usc_v1';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: ALTER purchase_frequency DATA TYPE (INTEGER -> DECIMAL)
-- ============================================================================
-- Purchase Frequency = deposit_cases / days_active (result is decimal)

DO $$ 
BEGIN
  -- Check current data type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tier_usc_v1' 
      AND column_name = 'purchase_frequency' 
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE tier_usc_v1 ALTER COLUMN purchase_frequency TYPE DECIMAL(15,2);
    RAISE NOTICE 'Column purchase_frequency data type changed from INTEGER to DECIMAL(15,2)';
  ELSE
    RAISE NOTICE 'Column purchase_frequency data type is already DECIMAL or does not exist';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE HELPER FUNCTION FOR SQUAD LEAD MAPPING
-- ============================================================================
-- This function makes it easy to update squad lead logic in the future
-- Just modify this function when line assignments change

CREATE OR REPLACE FUNCTION get_squad_lead_from_line(p_line VARCHAR(50))
RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN CASE
    -- SquadLead A
    WHEN p_line IN ('SBKH', 'SBKH99', '17WINKH', '17WIN168') THEN 'SquadLead A'
    -- SquadLead B
    WHEN p_line IN ('OK188KH', 'OK888KH', 'CAM68', 'CAM78', 'KH888', 'KH778') THEN 'SquadLead B'
    -- SquadLead C (default for all other lines)
    ELSE 'SquadLead C'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_squad_lead_from_line IS 'Map line to squad lead - Easy to update when line assignments change';

-- ============================================================================
-- STEP 4: UPDATE EXISTING DATA IN tier_usc_v1
-- ============================================================================
-- Update squad_lead, traffic, first_deposit_date, first_deposit_amount, purchase_frequency for existing records

WITH user_purchase_frequency AS (
  -- Recalculate purchase_frequency = deposit_cases / days_active per userkey, year, month
  SELECT 
    userkey,
    year,
    month,
    CASE 
      WHEN COUNT(DISTINCT CASE WHEN deposit_cases > 0 THEN date END) > 0
      THEN SUM(deposit_cases)::DECIMAL / COUNT(DISTINCT CASE WHEN deposit_cases > 0 THEN date END)
      ELSE 0 
    END as purchase_frequency
  FROM blue_whale_usc
  WHERE currency = 'USC'
  GROUP BY userkey, year, month
  HAVING SUM(deposit_cases) > 0
),
tier_records AS (
  -- Get all tier_usc_v1 records that need update
  SELECT userkey, year, month
  FROM tier_usc_v1
),
user_first_deposit_date_preferred AS (
  -- Get first_deposit_date if exists, else MIN(date) per userkey
  SELECT 
    userkey,
    COALESCE(MIN(first_deposit_date), MIN(date)) as first_deposit_date
  FROM blue_whale_usc
  WHERE currency = 'USC'
    AND (first_deposit_date IS NOT NULL OR date IS NOT NULL)
  GROUP BY userkey
),
user_first_deposit_amount AS (
  -- Get first_deposit_amount if exists, else deposit_amount on that date
  SELECT DISTINCT ON (b.userkey)
    b.userkey,
    COALESCE(b.first_deposit_amount, b.deposit_amount) as first_deposit_amount
  FROM blue_whale_usc b
  INNER JOIN user_first_deposit_date_preferred ufdp ON b.userkey = ufdp.userkey 
    AND (
      (b.first_deposit_date IS NOT NULL AND b.first_deposit_date = ufdp.first_deposit_date)
      OR 
      (b.first_deposit_date IS NULL AND b.date = ufdp.first_deposit_date)
    )
  WHERE b.currency = 'USC'
    AND (b.first_deposit_amount IS NOT NULL OR b.deposit_amount IS NOT NULL)
  ORDER BY b.userkey, 
    CASE WHEN b.first_deposit_amount IS NOT NULL THEN 0 ELSE 1 END,
    b.date
),
user_traffic AS (
  -- Get MAX(traffic) per userkey
  SELECT 
    userkey,
    MAX(traffic) as traffic
  FROM blue_whale_usc
  WHERE currency = 'USC'
    AND traffic IS NOT NULL
  GROUP BY userkey
)
UPDATE tier_usc_v1 t
SET 
  squad_lead = get_squad_lead_from_line(t.line),
  traffic = ut.traffic,
  first_deposit_date = ufdp.first_deposit_date,
  first_deposit_amount = ufda.first_deposit_amount,
  purchase_frequency = upf.purchase_frequency
FROM tier_records tr
INNER JOIN user_first_deposit_date_preferred ufdp ON tr.userkey = ufdp.userkey
LEFT JOIN user_first_deposit_amount ufda ON ufdp.userkey = ufda.userkey
LEFT JOIN user_traffic ut ON ufdp.userkey = ut.userkey
LEFT JOIN user_purchase_frequency upf ON tr.userkey = upf.userkey 
  AND tr.year = upf.year 
  AND tr.month = upf.month
WHERE t.userkey = tr.userkey
  AND t.year = tr.year
  AND t.month = tr.month
  AND (t.squad_lead IS NULL OR t.traffic IS NULL OR t.first_deposit_date IS NULL OR t.first_deposit_amount IS NULL OR upf.purchase_frequency IS NOT NULL);

-- ============================================================================
-- STEP 5: UPDATE refresh_tier_usc_v1_data() FUNCTION
-- ============================================================================
-- Add squad_lead to INSERT and UPDATE logic

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
  -- squad_lead will ALWAYS be refreshed (not preserved) to reflect current line assignments
  
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
    squad_lead,
    traffic,
    first_deposit_date,
    first_deposit_amount,
    tier,
    tier_name,
    tier_group,
    score
  )
  WITH user_metrics AS (
    SELECT 
      userkey,
      year,
      month,
      MAX(unique_code) as unique_code,
      MAX(user_name) as user_name,
      SPLIT_PART(userkey, '-', 3) as line,
      
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
      
      -- Purchase Frequency = deposit_cases / days_active
      CASE 
        WHEN COUNT(DISTINCT CASE WHEN deposit_cases > 0 THEN date END) > 0
        THEN SUM(deposit_cases)::DECIMAL / COUNT(DISTINCT CASE WHEN deposit_cases > 0 THEN date END)
        ELSE 0 
      END as purchase_frequency,
      
      CASE 
        WHEN SUM(deposit_amount) > 0 
        THEN (SUM(ggr) / SUM(deposit_amount)) * 100
        ELSE 0 
      END as win_rate,
      
      COUNT(DISTINCT CASE WHEN deposit_cases > 0 THEN date END) as active_days,
      
      -- Additional columns (ALWAYS refreshed)
      -- Traffic: MAX per userkey (overall, not filtered by year/month)
      -- First Deposit Date: first_deposit_date if exists, else MIN(date) per userkey (overall, not filtered by year/month)
      -- Note: These will be joined from separate CTEs below
      NULL::VARCHAR(100) as traffic,
      NULL::DATE as first_deposit_date
      
    FROM blue_whale_usc
    WHERE currency = 'USC'
      AND (p_year IS NULL OR year = p_year)
      AND (p_month IS NULL OR month = p_month)
    GROUP BY userkey, year, month
    HAVING SUM(deposit_cases) > 0
  ),
  user_traffic_overall AS (
    -- Get MAX(traffic) per userkey (overall, not filtered by year/month)
    SELECT 
      userkey,
      MAX(traffic) as traffic
    FROM blue_whale_usc
    WHERE currency = 'USC'
      AND traffic IS NOT NULL
    GROUP BY userkey
  ),
  user_first_deposit_date_overall AS (
    -- Get first_deposit_date if exists, else MIN(date) per userkey (overall, not filtered by year/month)
    SELECT 
      userkey,
      COALESCE(MIN(first_deposit_date), MIN(date)) as first_deposit_date
    FROM blue_whale_usc
    WHERE currency = 'USC'
      AND (first_deposit_date IS NOT NULL OR date IS NOT NULL)
    GROUP BY userkey
  ),
  user_first_deposit_amount AS (
    -- Get first_deposit_amount if exists, else deposit_amount on that date per userkey
    SELECT DISTINCT ON (b.userkey)
      b.userkey,
      COALESCE(b.first_deposit_amount, b.deposit_amount) as first_deposit_amount
    FROM blue_whale_usc b
    INNER JOIN user_first_deposit_date_overall ufdo ON b.userkey = ufdo.userkey
      AND (
        (b.first_deposit_date IS NOT NULL AND b.first_deposit_date = ufdo.first_deposit_date)
        OR 
        (b.first_deposit_date IS NULL AND b.date = ufdo.first_deposit_date)
      )
    WHERE b.currency = 'USC'
      AND (b.first_deposit_amount IS NOT NULL OR b.deposit_amount IS NOT NULL)
    ORDER BY b.userkey,
      CASE WHEN b.first_deposit_amount IS NOT NULL THEN 0 ELSE 1 END,
      b.date
  )
  SELECT 
    um.userkey,
    um.unique_code,
    um.user_name,
    um.line,
    um.year,
    um.month,
    um.total_deposit_amount,
    um.total_ggr,
    um.total_deposit_cases,
    um.total_withdraw_amount,
    um.total_withdraw_cases,
    um.total_net_profit,
    um.total_valid_amount,
    um.total_bonus,
    um.avg_transaction_value,
    um.purchase_frequency,
    um.win_rate,
    um.active_days,
    -- Squad Lead mapping (ALWAYS refreshed based on current line)
    get_squad_lead_from_line(um.line) as squad_lead,
    -- Traffic (ALWAYS refreshed - overall per userkey)
    ut.traffic,
    -- First Deposit Date (ALWAYS refreshed - first_deposit_date if exists, else MIN(date) per userkey)
    ufdo.first_deposit_date,
    -- First Deposit Amount (ALWAYS refreshed - first_deposit_amount if exists, else deposit_amount on that date per userkey)
    ufda.first_deposit_amount,
    -- Tier columns = NULL (will be preserved on conflict if exists)
    NULL as tier,
    NULL as tier_name,
    NULL as tier_group,
    NULL as score
  FROM user_metrics um
  LEFT JOIN user_traffic_overall ut ON um.userkey = ut.userkey
  LEFT JOIN user_first_deposit_date_overall ufdo ON um.userkey = ufdo.userkey
  LEFT JOIN user_first_deposit_amount ufda ON um.userkey = ufda.userkey
    
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
    -- Squad Lead ALWAYS refreshed (not preserved) to reflect current line assignments
    squad_lead = EXCLUDED.squad_lead,
    -- Traffic ALWAYS refreshed
    traffic = EXCLUDED.traffic,
    -- First Deposit Date ALWAYS refreshed
    first_deposit_date = EXCLUDED.first_deposit_date,
    -- First Deposit Amount ALWAYS refreshed
    first_deposit_amount = EXCLUDED.first_deposit_amount,
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
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tier_usc_v1_squad_lead ON tier_usc_v1(squad_lead);
CREATE INDEX IF NOT EXISTS idx_tier_usc_v1_traffic ON tier_usc_v1(traffic);
CREATE INDEX IF NOT EXISTS idx_tier_usc_v1_first_deposit_date ON tier_usc_v1(first_deposit_date);

-- ============================================================================
-- STEP 7: VERIFICATION QUERIES
-- ============================================================================

-- Check squad_lead distribution
SELECT 
  squad_lead,
  COUNT(*) as total_records,
  COUNT(DISTINCT userkey) as unique_customers,
  COUNT(DISTINCT line) as unique_lines,
  STRING_AGG(DISTINCT line, ', ' ORDER BY line) as lines
FROM tier_usc_v1
WHERE squad_lead IS NOT NULL
GROUP BY squad_lead
ORDER BY squad_lead;

-- Check by line to verify mapping
SELECT 
  line,
  squad_lead,
  COUNT(*) as records
FROM tier_usc_v1
WHERE line IS NOT NULL
GROUP BY line, squad_lead
ORDER BY line, squad_lead;

-- Check traffic distribution
SELECT 
  traffic,
  COUNT(*) as total_records,
  COUNT(DISTINCT userkey) as unique_customers
FROM tier_usc_v1
WHERE traffic IS NOT NULL
GROUP BY traffic
ORDER BY traffic
LIMIT 20;

-- Check first_deposit_date and first_deposit_amount
SELECT 
  COUNT(*) as total_records,
  COUNT(first_deposit_date) as records_with_first_deposit_date,
  COUNT(first_deposit_amount) as records_with_first_deposit_amount,
  MIN(first_deposit_date) as earliest_first_deposit,
  MAX(first_deposit_date) as latest_first_deposit,
  AVG(first_deposit_amount) as avg_first_deposit_amount
FROM tier_usc_v1;

-- Check for any NULL values (should be minimal after update)
SELECT 
  COUNT(*) as null_squad_lead_count
FROM tier_usc_v1
WHERE squad_lead IS NULL;

SELECT 
  COUNT(*) as null_traffic_count
FROM tier_usc_v1
WHERE traffic IS NULL;

SELECT 
  COUNT(*) as null_first_deposit_date_count
FROM tier_usc_v1
WHERE first_deposit_date IS NULL;

-- ============================================================================
-- HOW TO UPDATE SQUAD LEAD LOGIC IN THE FUTURE
-- ============================================================================
-- 
-- If line assignments change, simply update the function:
-- 
-- CREATE OR REPLACE FUNCTION get_squad_lead_from_line(p_line VARCHAR(50))
-- RETURNS VARCHAR(50) AS $$
-- BEGIN
--   RETURN CASE
--     -- Update SquadLead A lines here
--     WHEN p_line IN ('SBKH', 'SBKH99', '17WINKH', '17WIN168', 'NEW_LINE') THEN 'SquadLead A'
--     -- Update SquadLead B lines here
--     WHEN p_line IN ('OK188KH', 'OK888KH', 'CAM68', 'CAM78', 'KH888', 'KH778', 'ANOTHER_LINE') THEN 'SquadLead B'
--     -- SquadLead C (default)
--     ELSE 'SquadLead C'
--   END;
-- END;
-- $$ LANGUAGE plpgsql IMMUTABLE;
-- 
-- Then run: SELECT refresh_tier_usc_v1_data(); to update all records
-- 
-- ============================================================================
-- STATUS: READY TO EXECUTE
-- ============================================================================

