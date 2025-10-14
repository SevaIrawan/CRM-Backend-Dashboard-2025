-- ========================================
-- USER ACTIVITY LOGS TABLE
-- ========================================
-- Purpose: Track all user activities for admin monitoring
-- Features: Login, Logout, Page Views with full details
-- Access: Admin only can view logs
-- Created: 2025-01-14
-- ========================================

-- Create user_activity_logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  
  -- User Information
  user_id UUID, -- References auth.users(id) but nullable for flexibility
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  
  -- Activity Details
  activity_type TEXT NOT NULL, -- 'login', 'logout', 'page_view'
  
  -- Network Information
  ip_address TEXT,
  user_agent TEXT, -- Full browser user agent string
  device_type TEXT, -- 'Desktop', 'Mobile', 'Tablet'
  browser TEXT, -- 'Chrome', 'Firefox', 'Safari', etc
  os TEXT, -- 'Windows', 'macOS', 'Linux', 'iOS', 'Android'
  
  -- Page Information
  accessed_page TEXT, -- Full URL path (e.g., '/myr/overview')
  page_title TEXT, -- User-friendly page name (e.g., 'MYR Overview')
  referrer TEXT, -- Previous page URL
  
  -- Timing Information
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  session_id TEXT, -- Track user sessions
  session_duration INTEGER, -- Duration in seconds (for logout events)
  
  -- Additional Data
  metadata JSONB, -- For any additional tracking data
  
  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Index on user_id for fast user-specific queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id 
ON user_activity_logs(user_id);

-- Index on username for fast username searches
CREATE INDEX IF NOT EXISTS idx_activity_logs_username 
ON user_activity_logs(username);

-- Index on timestamp (descending) for fast recent logs retrieval
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp 
ON user_activity_logs(timestamp DESC);

-- Index on activity_type for filtering by activity
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type 
ON user_activity_logs(activity_type);

-- Index on role for filtering by user role
CREATE INDEX IF NOT EXISTS idx_activity_logs_role 
ON user_activity_logs(role);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp_type 
ON user_activity_logs(timestamp DESC, activity_type);

-- Index on session_id for session tracking
CREATE INDEX IF NOT EXISTS idx_activity_logs_session_id 
ON user_activity_logs(session_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on the table
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can insert logs
CREATE POLICY "Users can insert their own activity logs"
ON user_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Only admin can view all logs
-- Note: You'll need to adjust this based on your auth system
-- This example assumes there's a users table with role column
CREATE POLICY "Admin can view all activity logs"
ON user_activity_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ========================================
-- HELPFUL QUERIES FOR ADMIN
-- ========================================

-- View recent activity (last 24 hours)
-- SELECT * FROM user_activity_logs 
-- WHERE timestamp > NOW() - INTERVAL '24 hours'
-- ORDER BY timestamp DESC;

-- View login/logout summary
-- SELECT 
--   username,
--   COUNT(*) FILTER (WHERE activity_type = 'login') as login_count,
--   COUNT(*) FILTER (WHERE activity_type = 'logout') as logout_count,
--   AVG(session_duration) FILTER (WHERE activity_type = 'logout') as avg_session_minutes
-- FROM user_activity_logs
-- WHERE timestamp > NOW() - INTERVAL '7 days'
-- GROUP BY username
-- ORDER BY login_count DESC;

-- View most visited pages
-- SELECT 
--   page_title,
--   COUNT(*) as visit_count
-- FROM user_activity_logs
-- WHERE activity_type = 'page_view'
--   AND timestamp > NOW() - INTERVAL '7 days'
-- GROUP BY page_title
-- ORDER BY visit_count DESC
-- LIMIT 10;

-- View active sessions
-- SELECT 
--   username,
--   ip_address,
--   MAX(timestamp) as last_activity
-- FROM user_activity_logs
-- WHERE session_id IS NOT NULL
-- GROUP BY username, ip_address, session_id
-- HAVING MAX(timestamp) > NOW() - INTERVAL '30 minutes'
-- ORDER BY last_activity DESC;

-- ========================================
-- MAINTENANCE
-- ========================================

-- Optional: Create function to clean up old logs (if needed in future)
-- Currently storing permanently as requested
-- But keeping this as reference if policy changes

-- CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(days_to_keep INTEGER)
-- RETURNS INTEGER AS $$
-- DECLARE
--   deleted_count INTEGER;
-- BEGIN
--   DELETE FROM user_activity_logs
--   WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;
--   
--   GET DIAGNOSTICS deleted_count = ROW_COUNT;
--   RETURN deleted_count;
-- END;
-- $$ LANGUAGE plpgsql;

-- ========================================
-- NOTES
-- ========================================
-- 1. All user activities are tracked EXCEPT admin users
-- 2. Logs are stored permanently (no automatic deletion)
-- 3. Real-time tracking - every action is logged immediately
-- 4. Silent monitoring - users are not notified of tracking
-- 5. Admin-only access to view logs
-- ========================================

