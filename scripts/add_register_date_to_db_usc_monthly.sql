-- ============================================================================
-- ADD register_date COLUMN TO db_usc_monthly
-- ============================================================================
-- Purpose: Auto-generate register_date dari rs_blue_whale_usc berdasarkan user_unique
-- Logic: 
--   - Ambil register_date dari rs_blue_whale_usc berdasarkan user_unique
--   - Auto-fill saat INSERT/UPDATE melalui trigger
--   - Jika ada multiple rows per user_unique di rs_blue_whale_usc, 
--     ambil MIN(register_date) untuk konsistensi
-- ============================================================================

-- ============================================================================
-- STEP 1: CLEANUP TRIGGER/FUNGSI LAMA (jika ada)
-- ============================================================================
DROP TRIGGER IF EXISTS trg_set_register_date ON public.db_usc_monthly;
DROP FUNCTION IF EXISTS fn_set_register_date();

-- ============================================================================
-- STEP 2: TAMBAH KOLOM register_date
-- ============================================================================
ALTER TABLE public.db_usc_monthly
ADD COLUMN IF NOT EXISTS register_date DATE;

-- ============================================================================
-- STEP 3: BACKFILL DATA LAMA - SKIP DI SCRIPT INI (Jalankan script terpisah)
-- ============================================================================
-- ⚠️ BACKFILL DISKIP DI SINI untuk menghindari timeout
-- Jalankan script terpisah: add_register_date_to_db_usc_monthly_backfill.sql
-- atau backfill manual nanti setelah trigger sudah aktif

-- Data baru akan otomatis terisi via trigger
-- Data lama bisa di-backfill manual setelah trigger aktif

-- ============================================================================
-- STEP 4: BUAT FUNGSI untuk set register_date dari rs_blue_whale_usc
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_set_register_date()
RETURNS TRIGGER AS $$
DECLARE
  reg_date DATE;
BEGIN
  -- Jika user_unique tidak ada, biarkan register_date NULL
  IF NEW.user_unique IS NULL THEN
    -- Jika register_date sudah di-set manual, biarkan
    -- Jika tidak, set NULL
    IF NEW.register_date IS NULL THEN
      NEW.register_date := NULL;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Jika register_date sudah di-set manual (tidak NULL), biarkan (allow override)
  -- Tapi untuk safety, kita tetap lookup dari rs_blue_whale_usc jika belum di-set
  IF NEW.register_date IS NOT NULL THEN
    RETURN NEW; -- User sudah set manual, biarkan
  END IF;
  
  -- Cari register_date dari rs_blue_whale_usc untuk user_unique ini
  -- Pakai MIN untuk konsistensi (kalau ada multiple rows)
  SELECT MIN(register_date) INTO reg_date
  FROM public.rs_blue_whale_usc
  WHERE user_unique = NEW.user_unique
    AND register_date IS NOT NULL;
  
  -- Set register_date untuk row baru/update
  NEW.register_date := reg_date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_set_register_date IS 'Auto-fill register_date from rs_blue_whale_usc based on user_unique';

-- ============================================================================
-- STEP 5: BUAT TRIGGER (BEFORE INSERT/UPDATE)
-- ============================================================================
CREATE TRIGGER trg_set_register_date
BEFORE INSERT OR UPDATE OF user_unique, register_date
ON public.db_usc_monthly
FOR EACH ROW
EXECUTE FUNCTION fn_set_register_date();

-- ============================================================================
-- STEP 6: BUAT INDEX untuk performa (jika belum ada) - SKIP DULU
-- ============================================================================
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rs_blue_whale_usc_user_unique_register_date
--   ON public.rs_blue_whale_usc(user_unique, register_date)
--   WHERE register_date IS NOT NULL;
