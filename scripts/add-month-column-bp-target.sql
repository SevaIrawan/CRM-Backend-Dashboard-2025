-- ============================================================================
-- ADD MONTH COLUMN TO bp_target TABLE
-- ============================================================================
-- Purpose: Add month column to support monthly breakdown of quarterly targets
-- ============================================================================

-- Add month column
ALTER TABLE bp_target 
ADD COLUMN IF NOT EXISTS month VARCHAR(20) CHECK (month IN (
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
));

-- Drop old unique constraint (if exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_target' 
    AND conrelid = 'bp_target'::regclass
  ) THEN
    ALTER TABLE bp_target DROP CONSTRAINT unique_target;
  END IF;
END $$;

-- Add new unique constraint with month (allow NULL for backward compatibility)
-- Note: NULL values are considered distinct in UNIQUE constraints
ALTER TABLE bp_target 
ADD CONSTRAINT unique_target UNIQUE (currency, line, year, quarter, month);

-- Update index to include month
DROP INDEX IF EXISTS idx_bp_target_year_quarter;
CREATE INDEX idx_bp_target_year_quarter ON bp_target(year, quarter, month);

-- Update lookup index
DROP INDEX IF EXISTS idx_bp_target_lookup;
CREATE INDEX idx_bp_target_lookup ON bp_target(currency, line, year, quarter, month) 
  WHERE is_active = TRUE;

-- Update audit log table to include month
ALTER TABLE bp_target_audit_log 
ADD COLUMN IF NOT EXISTS month VARCHAR(20);

-- Update audit log index
DROP INDEX IF EXISTS idx_audit_currency_year;
CREATE INDEX idx_audit_currency_year ON bp_target_audit_log(currency, year, quarter, month);

-- Comments
COMMENT ON COLUMN bp_target.month IS 'Month name: January through December. Used for monthly breakdown of quarterly targets.';
COMMENT ON COLUMN bp_target_audit_log.month IS 'Month name for audit tracking';

