-- ============================================================
-- SNR MYR HANDLER TABLE
-- ============================================================
-- Purpose: Store handler assignments for each SNR account in MYR market
-- Features: Track who handles each SNR account, when assigned, and by whom
-- Note: Separate tables for each market (snr_usc_handler, snr_myr_handler, snr_sgd_handler)
-- ============================================================

-- Drop existing table if exists (for clean reinstall)
DROP TABLE IF EXISTS snr_myr_handler;

-- Create table
CREATE TABLE snr_myr_handler (
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
CREATE INDEX idx_snr_myr_handler_snr_account ON snr_myr_handler(snr_account);
CREATE INDEX idx_snr_myr_handler_line ON snr_myr_handler(line);
CREATE INDEX idx_snr_myr_handler_handler ON snr_myr_handler(handler);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_snr_myr_handler_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_snr_myr_handler_timestamp
  BEFORE UPDATE ON snr_myr_handler
  FOR EACH ROW
  EXECUTE FUNCTION update_snr_myr_handler_timestamp();

-- ============================================================
-- NOTES
-- ============================================================
-- This table stores the handler for each SNR account in MYR market.
-- When a user selects an SNR account in Customer Assignment (MYR),
-- the handler will be auto-fetched from this table.
-- ============================================================

