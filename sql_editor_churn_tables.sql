-- ===========================================
-- SQL EDITOR: CHURN MEMBER & CUSTOMER DETAIL TABLES
-- ===========================================
-- Purpose: Create tables for churn analysis and customer details
-- Join Key: Line + Date + Currency (same as MV monthly tables)
-- ===========================================

-- ===========================================
-- 1. CHURN MEMBER TRACKING TABLES (3 TABLES BY CURRENCY)
-- ===========================================

-- 1.1 USC CHURN TRACKING TABLE (Source: blue_whale_usc)
CREATE TABLE IF NOT EXISTS blue_whale_churn_tracking_usc (
    id SERIAL PRIMARY KEY,
    userkey VARCHAR(255) NOT NULL,
    unique_code VARCHAR(255) NOT NULL,
    line VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USC',
    date DATE NOT NULL,
    year VARCHAR(4) NOT NULL,
    month VARCHAR(20) NOT NULL,
    churn_date DATE NOT NULL,
    last_activity_date DATE,
    last_deposit_date DATE,
    days_since_last_activity INTEGER,
    days_since_last_deposit INTEGER,
    total_deposit_amount DECIMAL(15,2) DEFAULT 0,
    total_deposit_cases INTEGER DEFAULT 0,
    total_withdraw_amount DECIMAL(15,2) DEFAULT 0,
    total_withdraw_cases INTEGER DEFAULT 0,
    net_profit DECIMAL(15,2) DEFAULT 0,
    customer_lifetime_value DECIMAL(15,2) DEFAULT 0,
    avg_transaction_value DECIMAL(15,2) DEFAULT 0,
    purchase_frequency DECIMAL(10,4) DEFAULT 0,
    churn_reason VARCHAR(50) DEFAULT 'inactive', -- inactive, no_deposit, low_activity
    retention_days INTEGER DEFAULT 0,
    is_high_value BOOLEAN DEFAULT FALSE,
    is_low_value BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 SGD CHURN TRACKING TABLE (Source: blue_whale_sgd)
CREATE TABLE IF NOT EXISTS blue_whale_churn_tracking_sgd (
    id SERIAL PRIMARY KEY,
    userkey VARCHAR(255) NOT NULL,
    unique_code VARCHAR(255) NOT NULL,
    line VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'SGD',
    date DATE NOT NULL,
    year VARCHAR(4) NOT NULL,
    month VARCHAR(20) NOT NULL,
    churn_date DATE NOT NULL,
    last_activity_date DATE,
    last_deposit_date DATE,
    days_since_last_activity INTEGER,
    days_since_last_deposit INTEGER,
    total_deposit_amount DECIMAL(15,2) DEFAULT 0,
    total_deposit_cases INTEGER DEFAULT 0,
    total_withdraw_amount DECIMAL(15,2) DEFAULT 0,
    total_withdraw_cases INTEGER DEFAULT 0,
    net_profit DECIMAL(15,2) DEFAULT 0,
    customer_lifetime_value DECIMAL(15,2) DEFAULT 0,
    avg_transaction_value DECIMAL(15,2) DEFAULT 0,
    purchase_frequency DECIMAL(10,4) DEFAULT 0,
    churn_reason VARCHAR(50) DEFAULT 'inactive', -- inactive, no_deposit, low_activity
    retention_days INTEGER DEFAULT 0,
    is_high_value BOOLEAN DEFAULT FALSE,
    is_low_value BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.3 MYR CHURN TRACKING TABLE (Source: blue_whale_myr)
CREATE TABLE IF NOT EXISTS blue_whale_churn_tracking_myr (
    id SERIAL PRIMARY KEY,
    userkey VARCHAR(255) NOT NULL,
    unique_code VARCHAR(255) NOT NULL,
    line VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'MYR',
    date DATE NOT NULL,
    year VARCHAR(4) NOT NULL,
    month VARCHAR(20) NOT NULL,
    churn_date DATE NOT NULL,
    last_activity_date DATE,
    last_deposit_date DATE,
    days_since_last_activity INTEGER,
    days_since_last_deposit INTEGER,
    total_deposit_amount DECIMAL(15,2) DEFAULT 0,
    total_deposit_cases INTEGER DEFAULT 0,
    total_withdraw_amount DECIMAL(15,2) DEFAULT 0,
    total_withdraw_cases INTEGER DEFAULT 0,
    net_profit DECIMAL(15,2) DEFAULT 0,
    customer_lifetime_value DECIMAL(15,2) DEFAULT 0,
    avg_transaction_value DECIMAL(15,2) DEFAULT 0,
    purchase_frequency DECIMAL(10,4) DEFAULT 0,
    churn_reason VARCHAR(50) DEFAULT 'inactive', -- inactive, no_deposit, low_activity
    retention_days INTEGER DEFAULT 0,
    is_high_value BOOLEAN DEFAULT FALSE,
    is_low_value BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance - USC
CREATE INDEX IF NOT EXISTS idx_churn_tracking_usc_key ON blue_whale_churn_tracking_usc (line, date, currency);
CREATE INDEX IF NOT EXISTS idx_churn_tracking_usc_userkey ON blue_whale_churn_tracking_usc (userkey);
CREATE INDEX IF NOT EXISTS idx_churn_tracking_usc_unique_code ON blue_whale_churn_tracking_usc (unique_code);
CREATE INDEX IF NOT EXISTS idx_churn_tracking_usc_date ON blue_whale_churn_tracking_usc (date);

-- Indexes for performance - SGD
CREATE INDEX IF NOT EXISTS idx_churn_tracking_sgd_key ON blue_whale_churn_tracking_sgd (line, date, currency);
CREATE INDEX IF NOT EXISTS idx_churn_tracking_sgd_userkey ON blue_whale_churn_tracking_sgd (userkey);
CREATE INDEX IF NOT EXISTS idx_churn_tracking_sgd_unique_code ON blue_whale_churn_tracking_sgd (unique_code);
CREATE INDEX IF NOT EXISTS idx_churn_tracking_sgd_date ON blue_whale_churn_tracking_sgd (date);

-- Indexes for performance - MYR
CREATE INDEX IF NOT EXISTS idx_churn_tracking_myr_key ON blue_whale_churn_tracking_myr (line, date, currency);
CREATE INDEX IF NOT EXISTS idx_churn_tracking_myr_userkey ON blue_whale_churn_tracking_myr (userkey);
CREATE INDEX IF NOT EXISTS idx_churn_tracking_myr_unique_code ON blue_whale_churn_tracking_myr (unique_code);
CREATE INDEX IF NOT EXISTS idx_churn_tracking_myr_date ON blue_whale_churn_tracking_myr (date);

-- ===========================================
-- 2. CUSTOMER DETAIL TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS blue_whale_customer_detail (
    id SERIAL PRIMARY KEY,
    userkey VARCHAR(255) NOT NULL,
    unique_code VARCHAR(255) NOT NULL,
    line VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    year VARCHAR(4) NOT NULL,
    month VARCHAR(20) NOT NULL,
    first_deposit_date DATE,
    last_activity_date DATE,
    last_deposit_date DATE,
    customer_status VARCHAR(20) DEFAULT 'active', -- active, churned, new, retained
    total_deposit_amount DECIMAL(15,2) DEFAULT 0,
    total_deposit_cases INTEGER DEFAULT 0,
    total_withdraw_amount DECIMAL(15,2) DEFAULT 0,
    total_withdraw_cases INTEGER DEFAULT 0,
    net_profit DECIMAL(15,2) DEFAULT 0,
    customer_lifetime_value DECIMAL(15,2) DEFAULT 0,
    avg_transaction_value DECIMAL(15,2) DEFAULT 0,
    purchase_frequency DECIMAL(10,4) DEFAULT 0,
    customer_maturity_index DECIMAL(10,4) DEFAULT 0,
    retention_days INTEGER DEFAULT 0,
    is_high_value BOOLEAN DEFAULT FALSE,
    is_low_value BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_detail_key ON blue_whale_customer_detail (line, date, currency);
CREATE INDEX IF NOT EXISTS idx_customer_detail_userkey ON blue_whale_customer_detail (userkey);
CREATE INDEX IF NOT EXISTS idx_customer_detail_unique_code ON blue_whale_customer_detail (unique_code);
CREATE INDEX IF NOT EXISTS idx_customer_detail_date ON blue_whale_customer_detail (date);
CREATE INDEX IF NOT EXISTS idx_customer_detail_status ON blue_whale_customer_detail (customer_status);

-- ===========================================
-- 3. CHURN MEMBER AGGREGATION TABLE (for MV monthly join)
-- ===========================================
CREATE TABLE IF NOT EXISTS blue_whale_churn_monthly (
    id SERIAL PRIMARY KEY,
    line VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    year VARCHAR(4) NOT NULL,
    month VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    total_churn_members INTEGER DEFAULT 0,
    total_churn_amount DECIMAL(15,2) DEFAULT 0,
    avg_churn_clv DECIMAL(15,2) DEFAULT 0,
    churn_rate DECIMAL(10,4) DEFAULT 0,
    retention_rate DECIMAL(10,4) DEFAULT 0,
    growth_rate DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(line, currency, year, month, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_churn_monthly_key ON blue_whale_churn_monthly (line, date, currency);
CREATE INDEX IF NOT EXISTS idx_churn_monthly_year_month ON blue_whale_churn_monthly (year, month);

-- ===========================================
-- 4. CUSTOMER DETAIL AGGREGATION TABLE (for MV monthly join)
-- ===========================================
CREATE TABLE IF NOT EXISTS blue_whale_customer_monthly (
    id SERIAL PRIMARY KEY,
    line VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    year VARCHAR(4) NOT NULL,
    month VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    total_active_members INTEGER DEFAULT 0,
    total_pure_users INTEGER DEFAULT 0,
    total_new_members INTEGER DEFAULT 0,
    total_retained_members INTEGER DEFAULT 0,
    total_high_value_customers INTEGER DEFAULT 0,
    total_low_value_customers INTEGER DEFAULT 0,
    avg_customer_lifetime_value DECIMAL(15,2) DEFAULT 0,
    avg_purchase_frequency DECIMAL(10,4) DEFAULT 0,
    avg_customer_maturity_index DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(line, currency, year, month, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_monthly_key ON blue_whale_customer_monthly (line, date, currency);
CREATE INDEX IF NOT EXISTS idx_customer_monthly_year_month ON blue_whale_customer_monthly (year, month);

-- ===========================================
-- 5. STORED PROCEDURES FOR DATA POPULATION
-- ===========================================

-- Procedure to populate USC churn tracking
CREATE OR REPLACE FUNCTION populate_churn_tracking_usc(
    p_year VARCHAR(4),
    p_month VARCHAR(20)
) RETURNS VOID AS $$
BEGIN
    -- Insert churned members from blue_whale_usc
    INSERT INTO blue_whale_churn_tracking_usc (
        userkey, unique_code, line, currency, date, year, month,
        churn_date, last_activity_date, last_deposit_date,
        days_since_last_activity, days_since_last_deposit,
        total_deposit_amount, total_deposit_cases,
        total_withdraw_amount, total_withdraw_cases,
        net_profit, customer_lifetime_value, avg_transaction_value, purchase_frequency
    )
    SELECT 
        prev.userkey,
        prev.unique_code,
        prev.line,
        'USC' as currency,
        CURRENT_DATE as date,
        p_year as year,
        p_month as month,
        CURRENT_DATE as churn_date,
        prev.last_activity_date,
        prev.last_deposit_date,
        EXTRACT(DAYS FROM CURRENT_DATE - prev.last_activity_date)::INTEGER as days_since_last_activity,
        EXTRACT(DAYS FROM CURRENT_DATE - prev.last_deposit_date)::INTEGER as days_since_last_deposit,
        prev.total_deposit_amount,
        prev.total_deposit_cases,
        prev.total_withdraw_amount,
        prev.total_withdraw_cases,
        prev.net_profit,
        prev.customer_lifetime_value,
        prev.avg_transaction_value,
        prev.purchase_frequency
    FROM blue_whale_customer_detail prev
    LEFT JOIN blue_whale_customer_detail curr ON 
        prev.userkey = curr.userkey 
        AND prev.line = curr.line 
        AND prev.currency = curr.currency
        AND curr.year = p_year 
        AND curr.month = p_month
    WHERE prev.currency = 'USC'
        AND prev.year = p_year
        AND prev.month = p_month
        AND curr.userkey IS NULL
        AND prev.customer_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Procedure to populate SGD churn tracking
CREATE OR REPLACE FUNCTION populate_churn_tracking_sgd(
    p_year VARCHAR(4),
    p_month VARCHAR(20)
) RETURNS VOID AS $$
BEGIN
    -- Insert churned members from blue_whale_sgd
    INSERT INTO blue_whale_churn_tracking_sgd (
        userkey, unique_code, line, currency, date, year, month,
        churn_date, last_activity_date, last_deposit_date,
        days_since_last_activity, days_since_last_deposit,
        total_deposit_amount, total_deposit_cases,
        total_withdraw_amount, total_withdraw_cases,
        net_profit, customer_lifetime_value, avg_transaction_value, purchase_frequency
    )
    SELECT 
        prev.userkey,
        prev.unique_code,
        prev.line,
        'SGD' as currency,
        CURRENT_DATE as date,
        p_year as year,
        p_month as month,
        CURRENT_DATE as churn_date,
        prev.last_activity_date,
        prev.last_deposit_date,
        EXTRACT(DAYS FROM CURRENT_DATE - prev.last_activity_date)::INTEGER as days_since_last_activity,
        EXTRACT(DAYS FROM CURRENT_DATE - prev.last_deposit_date)::INTEGER as days_since_last_deposit,
        prev.total_deposit_amount,
        prev.total_deposit_cases,
        prev.total_withdraw_amount,
        prev.total_withdraw_cases,
        prev.net_profit,
        prev.customer_lifetime_value,
        prev.avg_transaction_value,
        prev.purchase_frequency
    FROM blue_whale_customer_detail prev
    LEFT JOIN blue_whale_customer_detail curr ON 
        prev.userkey = curr.userkey 
        AND prev.line = curr.line 
        AND prev.currency = curr.currency
        AND curr.year = p_year 
        AND curr.month = p_month
    WHERE prev.currency = 'SGD'
        AND prev.year = p_year
        AND prev.month = p_month
        AND curr.userkey IS NULL
        AND prev.customer_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Procedure to populate MYR churn tracking
CREATE OR REPLACE FUNCTION populate_churn_tracking_myr(
    p_year VARCHAR(4),
    p_month VARCHAR(20)
) RETURNS VOID AS $$
BEGIN
    -- Insert churned members from blue_whale_myr
    INSERT INTO blue_whale_churn_tracking_myr (
        userkey, unique_code, line, currency, date, year, month,
        churn_date, last_activity_date, last_deposit_date,
        days_since_last_activity, days_since_last_deposit,
        total_deposit_amount, total_deposit_cases,
        total_withdraw_amount, total_withdraw_cases,
        net_profit, customer_lifetime_value, avg_transaction_value, purchase_frequency
    )
    SELECT 
        prev.userkey,
        prev.unique_code,
        prev.line,
        'MYR' as currency,
        CURRENT_DATE as date,
        p_year as year,
        p_month as month,
        CURRENT_DATE as churn_date,
        prev.last_activity_date,
        prev.last_deposit_date,
        EXTRACT(DAYS FROM CURRENT_DATE - prev.last_activity_date)::INTEGER as days_since_last_activity,
        EXTRACT(DAYS FROM CURRENT_DATE - prev.last_deposit_date)::INTEGER as days_since_last_deposit,
        prev.total_deposit_amount,
        prev.total_deposit_cases,
        prev.total_withdraw_amount,
        prev.total_withdraw_cases,
        prev.net_profit,
        prev.customer_lifetime_value,
        prev.avg_transaction_value,
        prev.purchase_frequency
    FROM blue_whale_customer_detail prev
    LEFT JOIN blue_whale_customer_detail curr ON 
        prev.userkey = curr.userkey 
        AND prev.line = curr.line 
        AND prev.currency = curr.currency
        AND curr.year = p_year 
        AND curr.month = p_month
    WHERE prev.currency = 'MYR'
        AND prev.year = p_year
        AND prev.month = p_month
        AND curr.userkey IS NULL
        AND prev.customer_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Procedure to populate customer detail
CREATE OR REPLACE FUNCTION populate_customer_detail(
    p_currency VARCHAR(10),
    p_year VARCHAR(4),
    p_month VARCHAR(20)
) RETURNS VOID AS $$
BEGIN
    -- Insert customer details from master table
    INSERT INTO blue_whale_customer_detail (
        userkey, unique_code, line, currency, date, year, month,
        first_deposit_date, last_activity_date, last_deposit_date,
        customer_status, total_deposit_amount, total_deposit_cases,
        total_withdraw_amount, total_withdraw_cases, net_profit,
        customer_lifetime_value, avg_transaction_value, purchase_frequency
    )
    SELECT 
        userkey,
        unique_code,
        line,
        currency,
        CURRENT_DATE as date,
        p_year as year,
        p_month as month,
        MIN(date) OVER (PARTITION BY userkey, line, currency) as first_deposit_date,
        MAX(date) OVER (PARTITION BY userkey, line, currency) as last_activity_date,
        MAX(CASE WHEN deposit_cases > 0 THEN date END) OVER (PARTITION BY userkey, line, currency) as last_deposit_date,
        CASE 
            WHEN MAX(date) OVER (PARTITION BY userkey, line, currency) >= CURRENT_DATE - INTERVAL '30 days' THEN 'active'
            ELSE 'churned'
        END as customer_status,
        SUM(deposit_amount) as total_deposit_amount,
        SUM(deposit_cases) as total_deposit_cases,
        SUM(withdraw_amount) as total_withdraw_amount,
        SUM(withdraw_cases) as total_withdraw_cases,
        SUM(net_profit) as net_profit,
        CASE 
            WHEN SUM(deposit_cases) > 0 THEN 
                (SUM(deposit_amount) / SUM(deposit_cases)) * 
                (SUM(deposit_cases) / COUNT(DISTINCT userkey)) * 
                (1 / NULLIF(EXTRACT(DAYS FROM CURRENT_DATE - MIN(date)) / 30.0, 0))
            ELSE 0
        END as customer_lifetime_value,
        CASE 
            WHEN SUM(deposit_cases) > 0 THEN SUM(deposit_amount) / SUM(deposit_cases)
            ELSE 0
        END as avg_transaction_value,
        CASE 
            WHEN COUNT(DISTINCT userkey) > 0 THEN SUM(deposit_cases) / COUNT(DISTINCT userkey)
            ELSE 0
        END as purchase_frequency
    FROM blue_whale_usc  -- Change to appropriate master table based on currency
    WHERE currency = p_currency
        AND year = p_year
        AND month = p_month
        AND deposit_cases > 0
    GROUP BY userkey, unique_code, line, currency;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 6. VIEWS FOR EASY QUERYING
-- ===========================================

-- View for churn analysis
CREATE OR REPLACE VIEW v_churn_analysis AS
SELECT 
    c.line,
    c.currency,
    c.year,
    c.month,
    c.date,
    COUNT(c.userkey) as total_churn_members,
    SUM(c.total_deposit_amount) as total_churn_amount,
    AVG(c.customer_lifetime_value) as avg_churn_clv,
    AVG(c.days_since_last_activity) as avg_days_since_activity,
    AVG(c.days_since_last_deposit) as avg_days_since_deposit
FROM blue_whale_churn_tracking c
GROUP BY c.line, c.currency, c.year, c.month, c.date;

-- View for customer analysis
CREATE OR REPLACE VIEW v_customer_analysis AS
SELECT 
    cd.line,
    cd.currency,
    cd.year,
    cd.month,
    cd.date,
    COUNT(cd.userkey) as total_active_members,
    COUNT(DISTINCT cd.unique_code) as total_pure_users,
    COUNT(CASE WHEN cd.customer_status = 'new' THEN 1 END) as total_new_members,
    COUNT(CASE WHEN cd.customer_status = 'retained' THEN 1 END) as total_retained_members,
    COUNT(CASE WHEN cd.is_high_value THEN 1 END) as total_high_value_customers,
    COUNT(CASE WHEN cd.is_low_value THEN 1 END) as total_low_value_customers,
    AVG(cd.customer_lifetime_value) as avg_customer_lifetime_value,
    AVG(cd.purchase_frequency) as avg_purchase_frequency,
    AVG(cd.customer_maturity_index) as avg_customer_maturity_index
FROM blue_whale_customer_detail cd
GROUP BY cd.line, cd.currency, cd.year, cd.month, cd.date;

-- ===========================================
-- 7. EXPORT QUERIES (for churn member export)
-- ===========================================

-- Query 1: Export ALL USC churn members for specific period
-- SELECT 
--     userkey,
--     unique_code,
--     line,
--     currency,
--     year,
--     month,
--     churn_date,
--     last_activity_date,
--     last_deposit_date,
--     days_since_last_activity,
--     days_since_last_deposit,
--     total_deposit_amount,
--     total_deposit_cases,
--     total_withdraw_amount,
--     total_withdraw_cases,
--     net_profit,
--     customer_lifetime_value,
--     avg_transaction_value,
--     purchase_frequency,
--     churn_reason,
--     retention_days,
--     is_high_value,
--     is_low_value
-- FROM blue_whale_churn_tracking_usc 
-- WHERE year = '2025' AND month = 'January'
-- ORDER BY churn_date DESC, total_deposit_amount DESC;

-- Query 1b: Export ALL SGD churn members for specific period
-- SELECT 
--     userkey,
--     unique_code,
--     line,
--     currency,
--     year,
--     month,
--     churn_date,
--     last_activity_date,
--     last_deposit_date,
--     days_since_last_activity,
--     days_since_last_deposit,
--     total_deposit_amount,
--     total_deposit_cases,
--     total_withdraw_amount,
--     total_withdraw_cases,
--     net_profit,
--     customer_lifetime_value,
--     avg_transaction_value,
--     purchase_frequency,
--     churn_reason,
--     retention_days,
--     is_high_value,
--     is_low_value
-- FROM blue_whale_churn_tracking_sgd 
-- WHERE year = '2025' AND month = 'January'
-- ORDER BY churn_date DESC, total_deposit_amount DESC;

-- Query 1c: Export ALL MYR churn members for specific period
-- SELECT 
--     userkey,
--     unique_code,
--     line,
--     currency,
--     year,
--     month,
--     churn_date,
--     last_activity_date,
--     last_deposit_date,
--     days_since_last_activity,
--     days_since_last_deposit,
--     total_deposit_amount,
--     total_deposit_cases,
--     total_withdraw_amount,
--     total_withdraw_cases,
--     net_profit,
--     customer_lifetime_value,
--     avg_transaction_value,
--     purchase_frequency,
--     churn_reason,
--     retention_days,
--     is_high_value,
--     is_low_value
-- FROM blue_whale_churn_tracking_myr 
-- WHERE year = '2025' AND month = 'January'
-- ORDER BY churn_date DESC, total_deposit_amount DESC;

-- Query 2: Export churn members with filters
-- SELECT 
--     userkey,
--     unique_code,
--     line,
--     currency,
--     churn_date,
--     total_deposit_amount,
--     customer_lifetime_value,
--     churn_reason
-- FROM blue_whale_churn_tracking 
-- WHERE currency = 'USC' 
--     AND year = '2025' 
--     AND month = 'January'
--     AND line = 'ALL'  -- Filter by line
--     AND is_high_value = true  -- Filter high value customers
-- ORDER BY customer_lifetime_value DESC;

-- Query 3: Export churn summary by line
-- SELECT 
--     line,
--     currency,
--     year,
--     month,
--     COUNT(*) as total_churn_members,
--     SUM(total_deposit_amount) as total_churn_amount,
--     AVG(customer_lifetime_value) as avg_clv,
--     COUNT(CASE WHEN is_high_value THEN 1 END) as high_value_churn,
--     COUNT(CASE WHEN is_low_value THEN 1 END) as low_value_churn
-- FROM blue_whale_churn_tracking 
-- WHERE currency = 'USC' AND year = '2025' AND month = 'January'
-- GROUP BY line, currency, year, month
-- ORDER BY total_churn_members DESC;

-- ===========================================
-- 8. MONTHLY JOIN QUERIES (for MV monthly integration)
-- ===========================================

-- Query 1: Join USC churn data with USC MV monthly
-- SELECT 
--     mv.*,
--     COALESCE(c.total_churn_members, 0) as churn_members,
--     COALESCE(c.total_churn_amount, 0) as churn_amount,
--     COALESCE(c.avg_churn_clv, 0) as avg_churn_clv,
--     COALESCE(cd.total_active_members, 0) as active_members,
--     COALESCE(cd.total_pure_users, 0) as pure_users,
--     COALESCE(cd.avg_customer_lifetime_value, 0) as avg_customer_clv
-- FROM blue_whale_usc_summary mv
-- LEFT JOIN blue_whale_churn_monthly c ON 
--     mv.line = c.line AND mv.date = c.date AND mv.currency = c.currency
-- LEFT JOIN blue_whale_customer_monthly cd ON 
--     mv.line = cd.line AND mv.date = cd.date AND mv.currency = cd.currency
-- WHERE mv.currency = 'USC' AND mv.year = '2025' AND mv.month = 'January';

-- Query 1b: Join SGD churn data with SGD MV monthly
-- SELECT 
--     mv.*,
--     COALESCE(c.total_churn_members, 0) as churn_members,
--     COALESCE(c.total_churn_amount, 0) as churn_amount,
--     COALESCE(c.avg_churn_clv, 0) as avg_churn_clv,
--     COALESCE(cd.total_active_members, 0) as active_members,
--     COALESCE(cd.total_pure_users, 0) as pure_users,
--     COALESCE(cd.avg_customer_lifetime_value, 0) as avg_customer_clv
-- FROM blue_whale_sgd_summary mv
-- LEFT JOIN blue_whale_churn_monthly c ON 
--     mv.line = c.line AND mv.date = c.date AND mv.currency = c.currency
-- LEFT JOIN blue_whale_customer_monthly cd ON 
--     mv.line = cd.line AND mv.date = cd.date AND mv.currency = cd.currency
-- WHERE mv.currency = 'SGD' AND mv.year = '2025' AND mv.month = 'January';

-- Query 1c: Join MYR churn data with MYR MV monthly
-- SELECT 
--     mv.*,
--     COALESCE(c.total_churn_members, 0) as churn_members,
--     COALESCE(c.total_churn_amount, 0) as churn_amount,
--     COALESCE(c.avg_churn_clv, 0) as avg_churn_clv,
--     COALESCE(cd.total_active_members, 0) as active_members,
--     COALESCE(cd.total_pure_users, 0) as pure_users,
--     COALESCE(cd.avg_customer_lifetime_value, 0) as avg_customer_clv
-- FROM blue_whale_myr_summary mv
-- LEFT JOIN blue_whale_churn_monthly c ON 
--     mv.line = c.line AND mv.date = c.date AND mv.currency = c.currency
-- LEFT JOIN blue_whale_customer_monthly cd ON 
--     mv.line = cd.line AND mv.date = cd.date AND mv.currency = cd.currency
-- WHERE mv.currency = 'MYR' AND mv.year = '2025' AND mv.month = 'January';

-- Query 2: Join churn data with MYR MV monthly
-- SELECT 
--     mv.*,
--     COALESCE(c.total_churn_members, 0) as churn_members,
--     COALESCE(c.total_churn_amount, 0) as churn_amount,
--     COALESCE(cd.total_active_members, 0) as active_members,
--     COALESCE(cd.total_pure_users, 0) as pure_users
-- FROM blue_whale_myr_summary mv
-- LEFT JOIN blue_whale_churn_monthly c ON 
--     mv.line = c.line AND mv.date = c.date AND mv.currency = c.currency
-- LEFT JOIN blue_whale_customer_monthly cd ON 
--     mv.line = cd.line AND mv.date = cd.date AND mv.currency = cd.currency
-- WHERE mv.currency = 'MYR' AND mv.year = '2025' AND mv.month = 'January';

-- Query 3: Join churn data with SGD MV monthly
-- SELECT 
--     mv.*,
--     COALESCE(c.total_churn_members, 0) as churn_members,
--     COALESCE(c.total_churn_amount, 0) as churn_amount,
--     COALESCE(cd.total_active_members, 0) as active_members,
--     COALESCE(cd.total_pure_users, 0) as pure_users
-- FROM blue_whale_sgd_summary mv
-- LEFT JOIN blue_whale_churn_monthly c ON 
--     mv.line = c.line AND mv.date = c.date AND mv.currency = c.currency
-- LEFT JOIN blue_whale_customer_monthly cd ON 
--     mv.line = cd.line AND mv.date = cd.date AND mv.currency = cd.currency
-- WHERE mv.currency = 'SGD' AND mv.year = '2025' AND mv.month = 'January';

-- ===========================================
-- 9. KPI CALCULATION QUERIES (for dashboard)
-- ===========================================

-- Query 1: Calculate churn rate for specific period
-- SELECT 
--     mv.line,
--     mv.currency,
--     mv.year,
--     mv.month,
--     COALESCE(c.total_churn_members, 0) as churn_members,
--     COALESCE(cd.total_active_members, 0) as active_members,
--     CASE 
--         WHEN COALESCE(cd.total_active_members, 0) > 0 THEN 
--             (COALESCE(c.total_churn_members, 0)::DECIMAL / cd.total_active_members) * 100
--         ELSE 0
--     END as churn_rate
-- FROM blue_whale_usc_summary mv
-- LEFT JOIN blue_whale_churn_monthly c ON 
--     mv.line = c.line AND mv.date = c.date AND mv.currency = c.currency
-- LEFT JOIN blue_whale_customer_monthly cd ON 
--     mv.line = cd.line AND mv.date = cd.date AND mv.currency = cd.currency
-- WHERE mv.currency = 'USC' AND mv.year = '2025' AND mv.month = 'January';

-- Query 2: Calculate retention rate for specific period
-- SELECT 
--     mv.line,
--     mv.currency,
--     mv.year,
--     mv.month,
--     COALESCE(c.total_churn_members, 0) as churn_members,
--     COALESCE(cd.total_active_members, 0) as active_members,
--     CASE 
--         WHEN COALESCE(cd.total_active_members, 0) > 0 THEN 
--             100 - ((COALESCE(c.total_churn_members, 0)::DECIMAL / cd.total_active_members) * 100)
--         ELSE 0
--     END as retention_rate
-- FROM blue_whale_usc_summary mv
-- LEFT JOIN blue_whale_churn_monthly c ON 
--     mv.line = c.line AND mv.date = c.date AND mv.currency = c.currency
-- LEFT JOIN blue_whale_customer_monthly cd ON 
--     mv.line = cd.line AND mv.date = cd.date AND mv.currency = cd.currency
-- WHERE mv.currency = 'USC' AND mv.year = '2025' AND mv.month = 'January';

-- ===========================================
-- 8. TRIGGERS FOR AUTOMATIC UPDATES
-- ===========================================

-- Trigger to update churn monthly aggregation
CREATE OR REPLACE FUNCTION update_churn_monthly() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO blue_whale_churn_monthly (
        line, currency, year, month, date,
        total_churn_members, total_churn_amount, avg_churn_clv
    )
    SELECT 
        NEW.line, NEW.currency, NEW.year, NEW.month, NEW.date,
        COUNT(userkey), SUM(total_deposit_amount), AVG(customer_lifetime_value)
    FROM blue_whale_churn_tracking
    WHERE line = NEW.line AND currency = NEW.currency AND year = NEW.year AND month = NEW.month AND date = NEW.date
    ON CONFLICT (line, currency, year, month, date) 
    DO UPDATE SET
        total_churn_members = EXCLUDED.total_churn_members,
        total_churn_amount = EXCLUDED.total_churn_amount,
        avg_churn_clv = EXCLUDED.avg_churn_clv,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_churn_monthly
    AFTER INSERT OR UPDATE ON blue_whale_churn_tracking
    FOR EACH ROW EXECUTE FUNCTION update_churn_monthly();

-- ===========================================
-- 10. API ENDPOINTS STRUCTURE (for Next.js integration)
-- ===========================================

-- API 1: Export USC churn members (GET /api/churn/usc/export)
-- Query: SELECT * FROM blue_whale_churn_tracking_usc 
-- WHERE year = ? AND month = ? AND line = ?
-- ORDER BY churn_date DESC, total_deposit_amount DESC;

-- API 1b: Export SGD churn members (GET /api/churn/sgd/export)
-- Query: SELECT * FROM blue_whale_churn_tracking_sgd 
-- WHERE year = ? AND month = ? AND line = ?
-- ORDER BY churn_date DESC, total_deposit_amount DESC;

-- API 1c: Export MYR churn members (GET /api/churn/myr/export)
-- Query: SELECT * FROM blue_whale_churn_tracking_myr 
-- WHERE year = ? AND month = ? AND line = ?
-- ORDER BY churn_date DESC, total_deposit_amount DESC;

-- API 2: Get churn monthly data (GET /api/churn/monthly)
-- Query: SELECT * FROM blue_whale_churn_monthly 
-- WHERE currency = ? AND year = ? AND month = ? AND line = ?;

-- API 3: Get customer monthly data (GET /api/customer/monthly)
-- Query: SELECT * FROM blue_whale_customer_monthly 
-- WHERE currency = ? AND year = ? AND month = ? AND line = ?;

-- API 4: Join with MV monthly (GET /api/mv-monthly/with-churn)
-- Query: SELECT mv.*, c.*, cd.* FROM blue_whale_usc_summary mv
-- LEFT JOIN blue_whale_churn_monthly c ON mv.line = c.line AND mv.date = c.date AND mv.currency = c.currency
-- LEFT JOIN blue_whale_customer_monthly cd ON mv.line = cd.line AND mv.date = cd.date AND mv.currency = cd.currency
-- WHERE mv.currency = ? AND mv.year = ? AND mv.month = ? AND mv.line = ?;

-- ===========================================
-- 11. USAGE EXAMPLES
-- ===========================================

-- Example 1: Export all churn members for USC January 2025
-- SELECT * FROM blue_whale_churn_tracking 
-- WHERE currency = 'USC' AND year = '2025' AND month = 'January'
-- ORDER BY churn_date DESC;

-- Example 2: Get churn count for MV monthly join
-- SELECT 
--     mv.line,
--     mv.currency,
--     mv.year,
--     mv.month,
--     COALESCE(c.total_churn_members, 0) as churn_members,
--     COALESCE(cd.total_active_members, 0) as active_members
-- FROM blue_whale_usc_summary mv
-- LEFT JOIN blue_whale_churn_monthly c ON mv.line = c.line AND mv.date = c.date AND mv.currency = c.currency
-- LEFT JOIN blue_whale_customer_monthly cd ON mv.line = cd.line AND mv.date = cd.date AND mv.currency = cd.currency
-- WHERE mv.currency = 'USC' AND mv.year = '2025' AND mv.month = 'January';

-- Example 3: Calculate churn rate for dashboard
-- SELECT 
--     line,
--     currency,
--     year,
--     month,
--     COALESCE(c.total_churn_members, 0) as churn_members,
--     COALESCE(cd.total_active_members, 0) as active_members,
--     CASE 
--         WHEN COALESCE(cd.total_active_members, 0) > 0 THEN 
--             (COALESCE(c.total_churn_members, 0)::DECIMAL / cd.total_active_members) * 100
--         ELSE 0
--     END as churn_rate
-- FROM blue_whale_usc_summary mv
-- LEFT JOIN blue_whale_churn_monthly c ON mv.line = c.line AND mv.date = c.date AND mv.currency = c.currency
-- LEFT JOIN blue_whale_customer_monthly cd ON mv.line = cd.line AND mv.date = cd.date AND mv.currency = cd.currency
-- WHERE mv.currency = 'USC' AND mv.year = '2025' AND mv.month = 'January';

-- ===========================================
-- END OF SQL EDITOR
-- ===========================================
