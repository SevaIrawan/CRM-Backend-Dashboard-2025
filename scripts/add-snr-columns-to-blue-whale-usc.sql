-- ============================================================================
-- ADD SNR COLUMNS TO blue_whale_usc TABLE
-- ============================================================================
-- Purpose: Add SNR assignment columns to blue_whale_usc
-- Columns: snr_account, snr_handler, snr_assigned_at, snr_assigned_by
-- ============================================================================

ALTER TABLE blue_whale_usc
  ADD COLUMN IF NOT EXISTS snr_account VARCHAR(100),
  ADD COLUMN IF NOT EXISTS snr_handler VARCHAR(100),
  ADD COLUMN IF NOT EXISTS snr_assigned_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS snr_assigned_by VARCHAR(100);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_blue_whale_usc_snr_account 
ON blue_whale_usc(snr_account) 
WHERE snr_account IS NOT NULL;

