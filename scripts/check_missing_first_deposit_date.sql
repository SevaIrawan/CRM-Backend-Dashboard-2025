-- =========================
-- LIST: Customer berdasarkan update_unique_code yang first_deposit_date NULL atau kosong
-- Filter: deposit_cases > 0
-- Detail per row untuk di-check dan diperbaiki
-- =========================

SELECT 
  update_unique_code,
  user_unique,
  line,
  year,
  month,
  date,
  first_deposit_date,
  register_date,
  deposit_cases,
  deposit_amount,
  withdraw_amount,
  composite_key
FROM public.blue_whale_usc
WHERE currency = 'USC'
  AND deposit_cases > 0
  AND first_deposit_date IS NULL
ORDER BY 
  update_unique_code,
  year DESC,
  month,
  date DESC;
