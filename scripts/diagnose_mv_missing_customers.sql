-- =========================
-- DIAGNOSTIC: Find Missing Customers in MV Monthly
-- =========================
-- Purpose: Compare customer count between blue_whale_usc and MV monthly
-- Find why 12 customers are missing

-- =========================
-- STEP 1: Simulate MV Logic - Count customers after aggregation
-- =========================
WITH user_unique_first_deposit AS (
  SELECT user_unique, MIN(first_deposit_date) AS first_deposit_date
  FROM public.blue_whale_usc
  WHERE currency = 'USC' AND deposit_cases > 0
  GROUP BY user_unique
),
user_unique_register_date AS (
  SELECT user_unique, MIN(register_date) AS register_date
  FROM public.blue_whale_usc
  WHERE currency = 'USC' AND register_date IS NOT NULL
  GROUP BY user_unique
),
customer_monthly_base AS (
  SELECT
    d.user_unique,
    d.update_unique_code AS unique_code,
    d.year,
    d.month,
    d.line,
    ufd.first_deposit_date,
    urd.register_date,
    SUM(d.deposit_cases) AS deposit_cases
  FROM public.blue_whale_usc d
  LEFT JOIN user_unique_first_deposit ufd ON d.user_unique = ufd.user_unique
  LEFT JOIN user_unique_register_date urd ON d.user_unique = urd.user_unique
  WHERE d.currency = 'USC'
    AND d.update_unique_code IS NOT NULL
  GROUP BY d.user_unique, d.update_unique_code, d.year, d.month, d.line, ufd.first_deposit_date, urd.register_date
  HAVING SUM(d.deposit_cases) > 0
)
SELECT 
  'Customers in MV simulation (after aggregation)' AS description,
  COUNT(DISTINCT user_unique) AS customer_count
FROM customer_monthly_base;

-- =========================
-- STEP 2: Total customers dengan deposit_cases > 0 di blue_whale_usc (dashboard count)
-- =========================
SELECT 
  'Total customers in blue_whale_usc (deposit_cases > 0)' AS description,
  COUNT(DISTINCT user_unique) AS customer_count
FROM public.blue_whale_usc
WHERE currency = 'USC'
  AND deposit_cases > 0;

-- =========================
-- STEP 3: Customers di MV monthly (actual)
-- =========================
SELECT 
  'Customers in MV monthly (actual)' AS description,
  COUNT(DISTINCT user_unique) AS customer_count,
  COUNT(DISTINCT unique_code) AS unique_code_count,
  COUNT(*) AS total_records
FROM public.db_usc_monthly_customer_monthly_summary;

-- =========================
-- STEP 4: Find customers yang ada di blue_whale_usc tapi TIDAK ada di MV
-- =========================
WITH mv_customers AS (
  SELECT DISTINCT user_unique
  FROM public.db_usc_monthly_customer_monthly_summary
),
source_customers AS (
  SELECT DISTINCT user_unique
  FROM public.blue_whale_usc
  WHERE currency = 'USC'
    AND deposit_cases > 0
)
SELECT 
  'Missing customers (in source but NOT in MV)' AS description,
  sc.user_unique,
  COUNT(DISTINCT b.update_unique_code) AS unique_codes,
  COUNT(*) AS total_rows
FROM source_customers sc
LEFT JOIN mv_customers mv ON sc.user_unique = mv.user_unique
INNER JOIN public.blue_whale_usc b ON sc.user_unique = b.user_unique
WHERE mv.user_unique IS NULL
  AND b.currency = 'USC'
  AND b.deposit_cases > 0
GROUP BY sc.user_unique
ORDER BY total_rows DESC
LIMIT 20;

-- =========================
-- STEP 5: Check sample data untuk missing customers
-- =========================
WITH mv_customers AS (
  SELECT DISTINCT user_unique
  FROM public.db_usc_monthly_customer_monthly_summary
),
source_customers AS (
  SELECT DISTINCT user_unique
  FROM public.blue_whale_usc
  WHERE currency = 'USC'
    AND deposit_cases > 0
)
SELECT 
  b.user_unique,
  b.update_unique_code,
  b.year,
  b.month,
  b.line,
  b.deposit_cases,
  b.deposit_amount,
  b.unique_code AS original_unique_code
FROM source_customers sc
LEFT JOIN mv_customers mv ON sc.user_unique = mv.user_unique
INNER JOIN public.blue_whale_usc b ON sc.user_unique = b.user_unique
WHERE mv.user_unique IS NULL
  AND b.currency = 'USC'
  AND b.deposit_cases > 0
ORDER BY b.deposit_cases DESC
LIMIT 30;