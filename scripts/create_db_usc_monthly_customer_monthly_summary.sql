-- =========================
-- DROP & CREATE MATERIALIZED VIEW: db_usc_monthly_customer_monthly_summary
-- Source: public.db_usc_monthly
-- =========================

DROP MATERIALIZED VIEW IF EXISTS public.db_usc_monthly_customer_monthly_summary CASCADE;

CREATE MATERIALIZED VIEW public.db_usc_monthly_customer_monthly_summary AS

WITH user_unique_first_deposit AS (
  -- MIN first_deposit_date per user_unique across all months/years where deposit_cases > 0
  SELECT
    user_unique,
    MIN(first_deposit_date) AS first_deposit_date
  FROM public.db_usc_monthly
  WHERE currency = 'USC'
    AND deposit_cases > 0
  GROUP BY user_unique
),

user_unique_register_date AS (
  -- MIN register_date per user_unique across all months/years
  SELECT
    user_unique,
    MIN(register_date) AS register_date
  FROM public.db_usc_monthly
  WHERE currency = 'USC'
    AND register_date IS NOT NULL
  GROUP BY user_unique
),

customer_monthly_base AS (
  -- Aggregate per user_unique per month
  SELECT
    d.user_unique,
    d.unique_code,
    d.year,
    d.month,
    d.line,
    MAX(d.user_name) AS user_name,
    MAX(d.traffic)   AS traffic,
    ufd.first_deposit_date,
    urd.register_date,

    SUM(d.first_deposit_amount) AS first_deposit_amount,
    SUM(d.deposit_cases)        AS deposit_cases,
    SUM(d.deposit_amount)       AS deposit_amount,
    SUM(d.withdraw_cases)       AS withdraw_cases,
    SUM(d.withdraw_amount)      AS withdraw_amount,
    SUM(d.bonus)                AS bonus,
    SUM(d.add_bonus)            AS add_bonus,
    SUM(d.deduct_bonus)         AS deduct_bonus,
    SUM(d.add_transaction)      AS add_transaction,
    SUM(d.deduct_transaction)   AS deduct_transaction

  FROM public.db_usc_monthly d
  INNER JOIN user_unique_first_deposit ufd
    ON d.user_unique = ufd.user_unique
  LEFT JOIN user_unique_register_date urd
    ON d.user_unique = urd.user_unique
  WHERE d.currency = 'USC'
  GROUP BY
    d.user_unique, d.unique_code, d.year, d.month, d.line, ufd.first_deposit_date, urd.register_date
),

unique_code_market_dates AS (
  -- MIN first_deposit_date_market per unique_code across all brands where deposit_cases > 0
  SELECT
    unique_code,
    MIN(first_deposit_date) AS first_deposit_date_market
  FROM public.db_usc_monthly
  WHERE currency = 'USC'
    AND deposit_cases > 0
  GROUP BY unique_code
),

brand_info AS (
  -- brand_count & brand_name per unique_code per year-month
  SELECT
    unique_code,
    year,
    month,
    COUNT(DISTINCT line) AS brand_count,
    STRING_AGG(DISTINCT line, ' | ' ORDER BY line) AS brand_name
  FROM (
    SELECT
      unique_code, year, month, line,
      MIN(first_deposit_date) AS first_joined
    FROM public.db_usc_monthly
    WHERE currency = 'USC'
    GROUP BY unique_code, year, month, line
  ) brands
  GROUP BY unique_code, year, month
)

-- =========================
-- FINAL SELECT
-- =========================
SELECT
  b.user_unique,
  b.unique_code,
  b.year,
  b.month,
  b.line,
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

  -- Calculated columns (same style as your yearly MV)
  (b.deposit_amount - b.withdraw_amount) AS ggr,
  ((b.deposit_amount + b.add_transaction) - (b.withdraw_amount + b.deduct_transaction)) AS net_profit,

  CASE
    WHEN b.deposit_amount > 0
      THEN ((b.deposit_amount - b.withdraw_amount) / b.deposit_amount) * 100
    ELSE 0
  END AS winrate,

  CASE
    WHEN b.deposit_cases > 0
      THEN b.deposit_amount / b.deposit_cases
    ELSE 0
  END AS atv

FROM customer_monthly_base b
LEFT JOIN unique_code_market_dates m
  ON b.unique_code = m.unique_code
LEFT JOIN brand_info bi
  ON b.unique_code = bi.unique_code
 AND b.year = bi.year
 AND b.month = bi.month
ORDER BY b.year DESC, b.month, b.user_unique;

-- =========================
-- INDEXES
-- =========================
CREATE INDEX idx_usc_monthly_summary_user_unique
  ON public.db_usc_monthly_customer_monthly_summary(user_unique);

CREATE INDEX idx_usc_monthly_summary_year
  ON public.db_usc_monthly_customer_monthly_summary(year);

CREATE INDEX idx_usc_monthly_summary_month
  ON public.db_usc_monthly_customer_monthly_summary(month);

CREATE INDEX idx_usc_monthly_summary_unique_code
  ON public.db_usc_monthly_customer_monthly_summary(unique_code);

CREATE INDEX idx_usc_monthly_summary_first_deposit
  ON public.db_usc_monthly_customer_monthly_summary(first_deposit_date);

CREATE INDEX idx_usc_monthly_summary_register_date
  ON public.db_usc_monthly_customer_monthly_summary(register_date);

CREATE INDEX idx_usc_monthly_summary_first_deposit_market
  ON public.db_usc_monthly_customer_monthly_summary(first_deposit_date_market);

CREATE INDEX idx_usc_monthly_summary_deposit_cases
  ON public.db_usc_monthly_customer_monthly_summary(deposit_cases);

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
