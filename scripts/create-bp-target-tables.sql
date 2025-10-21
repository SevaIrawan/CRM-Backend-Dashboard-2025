-- ============================================================================
-- BUSINESS PERFORMANCE TARGET TABLE
-- ============================================================================
-- Purpose: Store quarterly targets for key business metrics
-- Scope: MYR, SGD, USD currencies
-- Granularity: Per line/brand per quarter
-- ============================================================================

CREATE TABLE bp_target (
  -- ============================================================================
  -- PRIMARY KEY & IDENTIFIERS
  -- ============================================================================
  id SERIAL PRIMARY KEY,
  
  -- ============================================================================
  -- SCOPE IDENTIFIERS
  -- ============================================================================
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('MYR', 'SGD', 'USD')),
  line VARCHAR(10) NOT NULL, -- 'ALL', 'SBMY', 'LVMY', 'JMMY', 'STMY', etc
  year INTEGER NOT NULL CHECK (year >= 2024 AND year <= 2100),
  quarter VARCHAR(2) NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  
  -- ============================================================================
  -- TARGET VALUES (Core 4 KPIs)
  -- ============================================================================
  target_ggr DECIMAL(15,2),              -- Gross Gaming Revenue target
  target_deposit_amount DECIMAL(15,2),   -- Deposit Amount target
  target_deposit_cases INTEGER,          -- Deposit Cases target
  target_active_member INTEGER,          -- Active Member target
  
  -- ============================================================================
  -- FORECAST VALUES (Optional)
  -- ============================================================================
  forecast_ggr DECIMAL(15,2),            -- Forecasted GGR
  
  -- ============================================================================
  -- STATUS & METADATA
  -- ============================================================================
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  
  -- ============================================================================
  -- AUDIT FIELDS
  -- ============================================================================
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),
  created_by_role VARCHAR(50),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(100),
  updated_by_role VARCHAR(50),
  
  -- ============================================================================
  -- CONSTRAINTS
  -- ============================================================================
  CONSTRAINT unique_target UNIQUE (currency, line, year, quarter),
  CONSTRAINT check_positive_targets CHECK (
    (target_ggr IS NULL OR target_ggr >= 0) AND
    (target_deposit_amount IS NULL OR target_deposit_amount >= 0) AND
    (target_deposit_cases IS NULL OR target_deposit_cases >= 0) AND
    (target_active_member IS NULL OR target_active_member >= 0)
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_bp_target_currency ON bp_target(currency);
CREATE INDEX idx_bp_target_year_quarter ON bp_target(year, quarter);
CREATE INDEX idx_bp_target_lookup ON bp_target(currency, line, year, quarter) 
  WHERE is_active = TRUE;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE bp_target IS 'Business Performance quarterly targets for key metrics';
COMMENT ON COLUMN bp_target.currency IS 'Currency: MYR, SGD, or USD';
COMMENT ON COLUMN bp_target.line IS 'Brand/Line: ALL or specific brand code';
COMMENT ON COLUMN bp_target.target_ggr IS 'Target Gross Gaming Revenue for the quarter';
COMMENT ON COLUMN bp_target.target_deposit_amount IS 'Target total deposit amount for the quarter';
COMMENT ON COLUMN bp_target.target_deposit_cases IS 'Target number of deposit transactions';
COMMENT ON COLUMN bp_target.target_active_member IS 'Target number of active members (with deposit)';

-- ============================================================================
-- BUSINESS PERFORMANCE TARGET AUDIT LOG
-- ============================================================================
-- Purpose: Track all changes to target values for compliance & accountability
-- ============================================================================

CREATE TABLE bp_target_audit_log (
  id SERIAL PRIMARY KEY,
  
  -- Reference
  target_id INTEGER REFERENCES bp_target(id) ON DELETE SET NULL,
  
  -- Scope (for filtering)
  currency VARCHAR(3) NOT NULL,
  line VARCHAR(10) NOT NULL,
  year INTEGER NOT NULL,
  quarter VARCHAR(2) NOT NULL,
  
  -- Action
  action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  
  -- Changes (Core 4 KPIs only)
  old_target_ggr DECIMAL(15,2),
  new_target_ggr DECIMAL(15,2),
  old_target_deposit_amount DECIMAL(15,2),
  new_target_deposit_amount DECIMAL(15,2),
  old_target_deposit_cases INTEGER,
  new_target_deposit_cases INTEGER,
  old_target_active_member INTEGER,
  new_target_active_member INTEGER,
  old_forecast_ggr DECIMAL(15,2),
  new_forecast_ggr DECIMAL(15,2),
  
  -- Who & When
  changed_by VARCHAR(100) NOT NULL,
  changed_by_role VARCHAR(50) NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  
  -- Security tracking
  ip_address VARCHAR(50),
  
  -- Additional info
  reason TEXT,
  notes TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_audit_target_id ON bp_target_audit_log(target_id);
CREATE INDEX idx_audit_currency_year ON bp_target_audit_log(currency, year, quarter);
CREATE INDEX idx_audit_changed_by ON bp_target_audit_log(changed_by);
CREATE INDEX idx_audit_changed_at ON bp_target_audit_log(changed_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE bp_target_audit_log IS 'Complete audit trail of all target changes';
COMMENT ON COLUMN bp_target_audit_log.action IS 'Type of change: CREATE, UPDATE, or DELETE';
COMMENT ON COLUMN bp_target_audit_log.changed_by IS 'Username of person who made the change';
COMMENT ON COLUMN bp_target_audit_log.changed_by_role IS 'Role of person who made the change (e.g., manager_myr)';
