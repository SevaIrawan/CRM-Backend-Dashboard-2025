-- ============================================================================
-- AUTO-UPDATE TIER TRIGGER
-- ============================================================================
-- Purpose: Auto-refresh tier_usc_v1 when blue_whale_usc has new data
-- Trigger: Every INSERT/UPDATE on blue_whale_usc
-- ============================================================================

-- Function yang dipanggil trigger
CREATE OR REPLACE FUNCTION auto_refresh_tier_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Only for USC currency
  IF NEW.currency = 'USC' THEN
    
    -- Delete old aggregation for this user-month
    DELETE FROM tier_usc_v1 
    WHERE userkey = NEW.userkey 
      AND year = NEW.year 
      AND month = NEW.month;
    
    -- Re-aggregate untuk user ini di month ini
    INSERT INTO tier_usc_v1 (
      userkey, unique_code, user_name, line, year, month,
      total_deposit_amount, total_ggr, total_deposit_cases,
      total_withdraw_amount, total_withdraw_cases, total_net_profit,
      total_valid_amount, total_bonus, avg_transaction_value,
      purchase_frequency, win_rate, active_days,
      tier, tier_name, tier_group, score
    )
    SELECT 
      userkey,
      MAX(unique_code),
      MAX(user_name),
      SPLIT_PART(userkey, '-', 3),
      year,
      month,
      SUM(deposit_amount),
      SUM(ggr),
      SUM(deposit_cases),
      SUM(withdraw_amount),
      SUM(withdraw_cases),
      SUM(net_profit),
      SUM(valid_amount),
      SUM(bonus),
      CASE WHEN SUM(deposit_cases) > 0 THEN SUM(deposit_amount) / SUM(deposit_cases) ELSE 0 END,
      SUM(deposit_cases),
      CASE WHEN SUM(deposit_amount) > 0 THEN (SUM(ggr) / SUM(deposit_amount)) * 100 ELSE 0 END,
      COUNT(DISTINCT CASE WHEN deposit_cases > 0 THEN date END),
      NULL, NULL, NULL, NULL  -- Tier will be calculated by API
    FROM blue_whale_usc
    WHERE userkey = NEW.userkey
      AND year = NEW.year
      AND month = NEW.month
      AND currency = 'USC'
    GROUP BY userkey, year, month
    HAVING SUM(deposit_cases) > 0;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger ke blue_whale_usc
DROP TRIGGER IF EXISTS auto_update_tier_trigger ON blue_whale_usc;

CREATE TRIGGER auto_update_tier_trigger
AFTER INSERT OR UPDATE ON blue_whale_usc
FOR EACH ROW
EXECUTE FUNCTION auto_refresh_tier_on_transaction();

-- ============================================================================
-- DONE! TIER_USC_V1 AKAN AUTO-REFRESH SETIAP ADA DATA BARU!
-- ============================================================================
-- 
-- NOTE: Tier calculation (1-7) MASIH PERLU API CALL!
-- Run daily: POST /api/calculate-tiers?mode=incremental
-- 
-- ============================================================================

