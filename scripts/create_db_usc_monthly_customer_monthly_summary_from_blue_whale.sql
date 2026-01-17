-- =========================
-- DROP & CREATE MATERIALIZED VIEW: db_usc_monthly_customer_monthly_summary
-- Source: public.blue_whale_usc (DIRECTLY)
-- Logic: Ambil semua data deposit_cases > 0, aggregate per (user_unique, update_unique_code, year, month, line)
-- =========================

DROP MATERIALIZED VIEW IF EXISTS public.db_usc_monthly_customer_monthly_summary CASCADE;

CREATE MATERIALIZED VIEW public.db_usc_monthly_customer_monthly_summary AS

WITH customer_monthly_base AS (
  SELECT
    d.user_unique,
    d.update_unique_code AS unique_code,
    d.year,
    d.month,
    d.line,
    MAX(d.user_name) AS user_name,
    MAX(d.traffic) AS traffic,
    MIN(d.first_deposit_date) AS first_deposit_date,
    MIN(d.register_date) AS register_date,
    
    SUM(d.first_deposit_amount) AS first_deposit_amount,
    SUM(d.deposit_cases) AS deposit_cases,
    SUM(d.deposit_amount) AS deposit_amount,
    SUM(d.withdraw_cases) AS withdraw_cases,
    SUM(d.withdraw_amount) AS withdraw_amount,
    SUM(d.bonus) AS bonus,
    SUM(d.add_bonus) AS add_bonus,
    SUM(d.deduct_bonus) AS deduct_bonus,
    SUM(d.add_transaction) AS add_transaction,
    SUM(d.deduct_transaction) AS deduct_transaction
    
  FROM public.blue_whale_usc d
  WHERE d.currency = 'USC'
    AND d.deposit_cases > 0
  GROUP BY
    d.user_unique, d.update_unique_code, d.year, d.month, d.line
),

unique_code_market_dates AS (
  SELECT
    update_unique_code AS unique_code,
    MIN(first_deposit_date) AS first_deposit_date_market
  FROM public.blue_whale_usc
  WHERE currency = 'USC'
    AND deposit_cases > 0
  GROUP BY update_unique_code
),

brand_info AS (
  SELECT
    update_unique_code AS unique_code,
    year,
    month,
    COUNT(DISTINCT line) AS brand_count,
    STRING_AGG(DISTINCT line, ' | ' ORDER BY line) AS brand_name
  FROM public.blue_whale_usc
  WHERE currency = 'USC'
    AND deposit_cases > 0
  GROUP BY update_unique_code, year, month
)

SELECT
  b.user_unique,
  b.unique_code,
  b.year,
  b.month,
  b.line,
  CASE 
    WHEN b.unique_code IS NOT NULL AND b.line IS NOT NULL 
      THEN b.unique_code || '-' || b.line
    ELSE NULL
  END AS composite_key,  -- ✅ Calculate composite_key (update_unique_code + '-' + line)
  b.user_name,
  b.traffic,
  
  b.first_deposit_date,
  b.register_date,
  m.first_deposit_date_market,
  
  bi.brand_count,
  bi.brand_name,
  
  b.first_deposit_amount,
  b.deposit_cases,
  b.deposit_amount,
  b.withdraw_cases,
  b.withdraw_amount,
  b.bonus,
  b.add_bonus,
  b.deduct_bonus,
  b.add_transaction,
  b.deduct_transaction,
  
  (b.deposit_amount - b.withdraw_amount) AS ggr,
  ((b.deposit_amount + b.add_transaction) - (b.withdraw_amount + b.deduct_transaction)) AS net_profit,
  
  CASE WHEN b.deposit_amount > 0 THEN ((b.deposit_amount - b.withdraw_amount) / b.deposit_amount) * 100 ELSE 0 END AS winrate,
  CASE WHEN b.deposit_cases > 0 THEN b.deposit_amount / b.deposit_cases ELSE 0 END AS atv

FROM customer_monthly_base b
LEFT JOIN unique_code_market_dates m ON b.unique_code = m.unique_code
LEFT JOIN brand_info bi ON b.unique_code = bi.unique_code AND b.year = bi.year AND b.month = bi.month
ORDER BY b.year DESC, b.month, b.user_unique;

-- =========================
-- INDEXES
-- =========================
CREATE INDEX idx_usc_monthly_summary_user_unique ON public.db_usc_monthly_customer_monthly_summary(user_unique);
CREATE INDEX idx_usc_monthly_summary_year ON public.db_usc_monthly_customer_monthly_summary(year);
CREATE INDEX idx_usc_monthly_summary_month ON public.db_usc_monthly_customer_monthly_summary(month);
CREATE INDEX idx_usc_monthly_summary_unique_code ON public.db_usc_monthly_customer_monthly_summary(unique_code);
CREATE INDEX idx_usc_monthly_summary_composite_key ON public.db_usc_monthly_customer_monthly_summary(composite_key);
CREATE INDEX idx_usc_monthly_summary_first_deposit ON public.db_usc_monthly_customer_monthly_summary(first_deposit_date);
CREATE INDEX idx_usc_monthly_summary_register_date ON public.db_usc_monthly_customer_monthly_summary(register_date);
CREATE INDEX idx_usc_monthly_summary_first_deposit_market ON public.db_usc_monthly_customer_monthly_summary(first_deposit_date_market);
CREATE INDEX idx_usc_monthly_summary_deposit_cases ON public.db_usc_monthly_customer_monthly_summary(deposit_cases);

-- =========================
-- VERIFY
-- =========================
SELECT
  year,
  month,
  COUNT(*) AS total_records,
  COUNT(DISTINCT user_unique) AS unique_customers,
  COUNT(DISTINCT unique_code) AS unique_codes,
  AVG(brand_count) AS avg_brand_count,
  MAX(brand_count) AS max_brand_count,
  COUNT(*) FILTER (WHERE register_date IS NOT NULL) AS records_with_register_date
FROM public.db_usc_monthly_customer_monthly_summary
GROUP BY year, month
ORDER BY year DESC, month;
