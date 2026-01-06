-- ============================================================
-- SNR USC HANDLER TABLE
-- ============================================================
-- Purpose: Store handler assignments for each SNR account in USC market
-- Features: Track who handles each SNR account, when assigned, and by whom
-- Note: Separate tables for each market (snr_usc_handler, snr_myr_handler, snr_sgd_handler)
-- ============================================================

-- Drop existing table if exists (for clean reinstall)
DROP TABLE IF EXISTS snr_usc_handler;

-- Create table
CREATE TABLE snr_usc_handler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snr_account TEXT NOT NULL UNIQUE, -- e.g., 'snr01_sbkh'
  line TEXT NOT NULL, -- e.g., 'SBKH'
  handler TEXT NOT NULL, -- e.g., 'Andi'
  assigned_by TEXT, -- Username who assigned the handler
  assigned_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_snr_usc_handler_snr_account ON snr_usc_handler(snr_account);
CREATE INDEX idx_snr_usc_handler_line ON snr_usc_handler(line);
CREATE INDEX idx_snr_usc_handler_handler ON snr_usc_handler(handler);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_snr_usc_handler_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_snr_usc_handler_timestamp
  BEFORE UPDATE ON snr_usc_handler
  FOR EACH ROW
  EXECUTE FUNCTION update_snr_usc_handler_timestamp();

-- ============================================================
-- NOTES
-- ============================================================
-- This table stores the handler for each SNR account in USC market.
-- When a user selects an SNR account in Customer Assignment (USC),
-- the handler will be auto-fetched from this table.
-- 
-- Similar tables should be created for other markets:
-- - snr_myr_handler (for MYR market)
-- - snr_sgd_handler (for SGD market)
-- ============================================================

