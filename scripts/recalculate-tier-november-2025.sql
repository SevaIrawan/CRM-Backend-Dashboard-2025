-- ============================================================================
-- RECALCULATE TIER NOVEMBER 2025
-- ============================================================================
-- Purpose: Re-calculate tier untuk November 2025 setelah update active_days logic
-- 
-- IMPORTANT: Script ini hanya untuk re-calculate tier yang sudah hilang
-- Tier calculation dilakukan via API, bukan SQL
-- 
-- Cara pakai:
-- 1. Pastikan data di tier_usc_v1 untuk November 2025 sudah ada (dari refresh_tier_usc_v1_data)
-- 2. Call API: POST /api/usc-business-performance/calculate-tiers?year=2025&month=November
-- 
-- ============================================================================

-- Check data yang perlu di-calculate
SELECT 
  COUNT(*) as total_records,
  COUNT(tier) as records_with_tier,
  COUNT(*) - COUNT(tier) as records_without_tier
FROM tier_usc_v1
WHERE year = 2025 
  AND month = 'November';

-- ============================================================================
-- CATATAN:
-- ============================================================================
-- Tier calculation HARUS dilakukan via API, bukan SQL
-- 
-- Untuk re-calculate tier November 2025, jalankan:
-- 
-- Method: POST
-- URL: /api/usc-business-performance/calculate-tiers?year=2025&month=November
-- 
-- Atau via curl:
-- curl -X POST "http://localhost:3000/api/usc-business-performance/calculate-tiers?year=2025&month=November"
-- 
-- ============================================================================

