-- =========================
-- ADD GENERATED COLUMN: composite_key
-- Table: public.blue_whale_usc
-- Logic: composite_key = update_unique_code || '-' || line (auto-generated)
-- =========================

-- STEP 1: Tambah kolom generated composite_key di blue_whale_usc
ALTER TABLE public.blue_whale_usc
ADD COLUMN IF NOT EXISTS composite_key TEXT 
GENERATED ALWAYS AS (
  CASE 
    WHEN update_unique_code IS NOT NULL AND line IS NOT NULL 
      THEN update_unique_code || '-' || line
    ELSE NULL
  END
) STORED;

-- STEP 2: Buat index untuk performa
CREATE INDEX IF NOT EXISTS idx_blue_whale_usc_composite_key 
  ON public.blue_whale_usc(composite_key);

-- STEP 3: Buat index composite untuk query yang lebih efisien
CREATE INDEX IF NOT EXISTS idx_blue_whale_usc_composite_key_year_month 
  ON public.blue_whale_usc(composite_key, year, month);

-- =========================
-- VERIFY
-- =========================
SELECT 
  COUNT(*) AS total_rows,
  COUNT(composite_key) AS rows_with_composite_key,
  COUNT(*) - COUNT(composite_key) AS rows_without_composite_key,
  COUNT(DISTINCT composite_key) AS unique_composite_keys
FROM public.blue_whale_usc
WHERE currency = 'USC'
  AND deposit_cases > 0;

-- Sample data
SELECT 
  user_unique,
  update_unique_code,
  line,
  composite_key,
  year,
  month,
  deposit_cases
FROM public.blue_whale_usc
WHERE currency = 'USC'
  AND deposit_cases > 0
  AND composite_key IS NOT NULL
LIMIT 10;
