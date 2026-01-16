-- ============================================================================
-- BACKFILL register_date untuk db_usc_monthly (Jalankan setelah trigger aktif)
-- ============================================================================
-- Purpose: Backfill register_date untuk data existing di db_usc_monthly
--          dari rs_blue_whale_usc berdasarkan user_unique
-- 
-- INSTRUKSI:
-- 1. Jalankan script utama dulu (add_register_date_to_db_usc_monthly.sql)
-- 2. Setelah trigger aktif, jalankan script ini untuk backfill data lama
-- 3. Jika timeout, gunakan OPSI 2 (Batch Processing)
-- ============================================================================

-- ============================================================================
-- OPSI 1: Backfill dengan JOIN (Lebih cepat, tapi bisa timeout jika data sangat besar)
-- ============================================================================
-- Uncomment dan jalankan jika data tidak terlalu besar:
/*
UPDATE public.db_usc_monthly d
SET register_date = r.min_register_date
FROM (
  SELECT 
    user_unique,
    MIN(register_date) AS min_register_date
  FROM public.rs_blue_whale_usc
  WHERE register_date IS NOT NULL
  GROUP BY user_unique
) r
WHERE d.user_unique = r.user_unique
  AND d.user_unique IS NOT NULL
  AND d.register_date IS NULL;
*/

-- ============================================================================
-- OPSI 2: Backfill dengan Batch Processing (RECOMMENDED untuk data besar)
-- ============================================================================
-- Jalankan query ini berulang kali sampai affected_rows = 0
-- Atau buat loop/script untuk auto-repeat

-- Batch 1: Process 10,000 rows pertama
DO $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.db_usc_monthly d
  SET register_date = (
    SELECT MIN(r.register_date)
    FROM public.rs_blue_whale_usc r
    WHERE r.user_unique = d.user_unique
      AND r.register_date IS NOT NULL
  )
  WHERE d.user_unique IS NOT NULL
    AND d.register_date IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.rs_blue_whale_usc r
      WHERE r.user_unique = d.user_unique
        AND r.register_date IS NOT NULL
    )
    AND d.ctid IN (
      SELECT ctid
      FROM public.db_usc_monthly
      WHERE user_unique IS NOT NULL
        AND register_date IS NULL
      LIMIT 10000
    );
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Updated % rows', affected_rows;
END $$;

-- Catatan: Jika masih banyak rows yang belum ter-update, jalankan lagi query di atas
-- atau gunakan query manual di bawah ini:

-- ============================================================================
-- OPSI 3: Backfill Manual dengan CTID (Alternative batch method)
-- ============================================================================
-- Jalankan query ini berulang kali, setiap kali akan update 10k rows
-- Berhenti saat affected_rows = 0

UPDATE public.db_usc_monthly d
SET register_date = (
  SELECT MIN(r.register_date)
  FROM public.rs_blue_whale_usc r
  WHERE r.user_unique = d.user_unique
    AND r.register_date IS NOT NULL
)
WHERE d.user_unique IS NOT NULL
  AND d.register_date IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.rs_blue_whale_usc r
    WHERE r.user_unique = d.user_unique
      AND r.register_date IS NOT NULL
  )
  AND d.ctid IN (
    SELECT ctid
    FROM public.db_usc_monthly
    WHERE user_unique IS NOT NULL
      AND register_date IS NULL
    LIMIT 10000
  );

-- ============================================================================
-- VERIFICATION: Check progress backfill
-- ============================================================================
SELECT 
  COUNT(*) AS total_rows,
  COUNT(register_date) AS rows_with_register_date,
  COUNT(*) - COUNT(register_date) AS rows_without_register_date,
  ROUND(100.0 * COUNT(register_date) / COUNT(*), 2) AS percentage_filled
FROM public.db_usc_monthly
WHERE user_unique IS NOT NULL;

-- Check rows yang belum terisi (untuk debugging)
SELECT 
  COUNT(*) AS rows_still_null
FROM public.db_usc_monthly d
WHERE d.user_unique IS NOT NULL
  AND d.register_date IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.rs_blue_whale_usc r
    WHERE r.user_unique = d.user_unique
      AND r.register_date IS NOT NULL
  );

-- ============================================================================
-- DONE!
-- ============================================================================
