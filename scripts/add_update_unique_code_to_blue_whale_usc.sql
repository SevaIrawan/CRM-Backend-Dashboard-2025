-- ============================================================================
-- ADD update_unique_code COLUMN TO blue_whale_usc
-- ============================================================================
-- Purpose: Auto-generate update_unique_code yang menampilkan unique_code 
--          terbaru per user_unique berdasarkan last_deposit_date
-- Logic: 
--   - Jika ada duplicate user_unique, ambil unique_code dari row dengan 
--     last_deposit_date paling terakhir
--   - Jika tidak ada duplicate, pakai unique_code yang sama
-- ============================================================================

-- ============================================================================
-- STEP 1: CLEANUP SEMUA TRIGGER/FUNGSI LAMA
-- ============================================================================
DROP TRIGGER IF EXISTS trg_set_update_unique_code ON blue_whale_usc;
DROP TRIGGER IF EXISTS trg_sync_all_update_unique_code ON blue_whale_usc;
DROP TRIGGER IF EXISTS trg_sync_update_unique_code ON blue_whale_usc;
DROP TRIGGER IF EXISTS trg_propagate_update_unique_code ON blue_whale_usc;
DROP FUNCTION IF EXISTS fn_set_update_unique_code();
DROP FUNCTION IF EXISTS fn_sync_all_update_unique_code();
DROP FUNCTION IF EXISTS fn_sync_update_unique_code();
DROP FUNCTION IF EXISTS fn_propagate_update_unique_code();

-- ============================================================================
-- STEP 2: TAMBAH KOLOM update_unique_code
-- ============================================================================
ALTER TABLE blue_whale_usc
ADD COLUMN IF NOT EXISTS update_unique_code text;

-- ============================================================================
-- STEP 3: BACKFILL DATA LAMA
-- ============================================================================
-- Update semua row dengan unique_code terbaru per user_unique
-- Berdasarkan last_deposit_date paling terakhir
WITH ranked AS (
  SELECT 
    ctid,
    first_value(unique_code) OVER (
      PARTITION BY user_unique
      ORDER BY last_deposit_date DESC NULLS LAST
    ) AS latest_unique_code
  FROM blue_whale_usc
)
UPDATE blue_whale_usc b
SET update_unique_code = r.latest_unique_code
FROM ranked r
WHERE b.ctid = r.ctid;

-- ============================================================================
-- STEP 4: BUAT FUNGSI SIMPLE untuk set update_unique_code
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_set_update_unique_code()
RETURNS TRIGGER AS $$
DECLARE
  latest_code text;
BEGIN
  -- Jika user_unique tidak ada, pakai unique_code yang sama
  IF NEW.user_unique IS NULL THEN
    NEW.update_unique_code := NEW.unique_code;
    RETURN NEW;
  END IF;
  
  -- Cari unique_code terbaru untuk user_unique ini
  -- Berdasarkan last_deposit_date paling terakhir
  SELECT unique_code INTO latest_code
  FROM blue_whale_usc
  WHERE user_unique = NEW.user_unique
    AND last_deposit_date IS NOT NULL
  ORDER BY last_deposit_date DESC NULLS LAST
  LIMIT 1;
  
  -- Jika tidak ada dengan last_deposit_date, pakai unique_code dari row yang baru
  IF latest_code IS NULL THEN
    latest_code := NEW.unique_code;
  END IF;
  
  -- Set update_unique_code untuk row baru
  NEW.update_unique_code := latest_code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: BUAT TRIGGER (BEFORE INSERT/UPDATE)
-- ============================================================================
CREATE TRIGGER trg_set_update_unique_code
BEFORE INSERT OR UPDATE OF user_unique, unique_code, last_deposit_date
ON blue_whale_usc
FOR EACH ROW
EXECUTE FUNCTION fn_set_update_unique_code();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check kolom sudah ditambah
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'blue_whale_usc' 
  AND column_name = 'update_unique_code';

-- ============================================================================
-- DONE!
-- ============================================================================
