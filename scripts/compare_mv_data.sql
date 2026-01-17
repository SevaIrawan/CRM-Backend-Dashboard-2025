-- Compare data antara MV baru dengan expected values
-- Untuk debug kenapa data di Pure Member Analysis berbeda

-- 1. Check sample data dari MV baru
SELECT 
  user_unique,
  unique_code,
  year,
  month,
  line,
  first_deposit_date,
  first_deposit_date_market,
  brand_count,
  brand_name,
  deposit_cases,
  deposit_amount,
  withdraw_amount,
  ggr,
  atv
FROM public.db_usc_monthly_customer_monthly_summary
WHERE year = 2025
  AND month = 'January'
LIMIT 20;

-- 2. Check apakah first_deposit_date_market NULL atau berbeda
SELECT 
  COUNT(*) AS total_records,
  COUNT(first_deposit_date_market) AS records_with_fdd_market,
  COUNT(*) - COUNT(first_deposit_date_market) AS records_without_fdd_market
FROM public.db_usc_monthly_customer_monthly_summary
WHERE year = 2025;

-- 3. Check apakah brand_count atau brand_name NULL
SELECT 
  COUNT(*) AS total_records,
  COUNT(brand_count) AS records_with_brand_count,
  COUNT(brand_name) AS records_with_brand_name,
  COUNT(*) - COUNT(brand_count) AS records_without_brand_count,
  COUNT(*) - COUNT(brand_name) AS records_without_brand_name
FROM public.db_usc_monthly_customer_monthly_summary
WHERE year = 2025;

-- 4. Sample records yang brand_count atau first_deposit_date_market NULL
SELECT 
  user_unique,
  unique_code,
  year,
  month,
  line,
  first_deposit_date,
  first_deposit_date_market,
  brand_count,
  brand_name
FROM public.db_usc_monthly_customer_monthly_summary
WHERE year = 2025
  AND (brand_count IS NULL OR brand_name IS NULL OR first_deposit_date_market IS NULL)
LIMIT 20;
