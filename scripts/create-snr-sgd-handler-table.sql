-- ============================================================
-- SNR SGD HANDLER TABLE
-- ============================================================
-- Purpose: Store handler assignments for each SNR account in SGD market
-- Features: Track who handles each SNR account, when assigned, and by whom
-- Note: Separate tables for each market (snr_usc_handler, snr_myr_handler, snr_sgd_handler)
-- ============================================================

-- Drop existing table if exists (for clean reinstall)
DROP TABLE IF EXISTS snr_sgd_handler;

-- Create table
CREATE TABLE snr_sgd_handler (
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
CREATE INDEX idx_snr_sgd_handler_snr_account ON snr_sgd_handler(snr_account);
CREATE INDEX idx_snr_sgd_handler_line ON snr_sgd_handler(line);
CREATE INDEX idx_snr_sgd_handler_handler ON snr_sgd_handler(handler);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_snr_sgd_handler_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_snr_sgd_handler_timestamp
  BEFORE UPDATE ON snr_sgd_handler
  FOR EACH ROW
  EXECUTE FUNCTION update_snr_sgd_handler_timestamp();

-- ============================================================
-- NOTES
-- ============================================================
-- This table stores the handler for each SNR account in SGD market.
-- When a user selects an SNR account in Customer Assignment (SGD),
-- the handler will be auto-fetched from this table.
-- ============================================================

