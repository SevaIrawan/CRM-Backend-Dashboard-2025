-- ========================================
-- FEEDBACK SYSTEM DATABASE SCHEMA
-- ========================================
-- Purpose: Support Feedback & Live Chat system
-- Features: Real-time chat, File upload, Priority management
-- ========================================

-- 1. TABLE: user_feedbacks (Main feedback/conversation thread)
CREATE TABLE IF NOT EXISTS user_feedbacks (
  id BIGSERIAL PRIMARY KEY,
  
  -- User Info
  user_id UUID REFERENCES auth.users(id),
  username TEXT NOT NULL,
  email TEXT,
  role TEXT,
  
  -- Feedback Info
  subject TEXT, -- Optional subject/title
  category TEXT NOT NULL, -- 'bug', 'feature_request', 'question', 'ui_ux', 'other'
  initial_message TEXT NOT NULL, -- First message dari user
  
  -- Page Context (where user submitted feedback)
  page_url TEXT,
  page_title TEXT,
  
  -- Status & Priority
  status TEXT DEFAULT 'pending', -- 'pending', 'replied', 'in_progress', 'resolved', 'closed'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  -- Assignment (optional untuk future: assign to specific admin)
  assigned_to TEXT,
  
  -- Metadata
  browser TEXT,
  device_type TEXT,
  os TEXT,
  ip_address TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_reply_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- 2. TABLE: feedback_replies (Chat messages)
CREATE TABLE IF NOT EXISTS feedback_replies (
  id BIGSERIAL PRIMARY KEY,
  feedback_id BIGINT NOT NULL REFERENCES user_feedbacks(id) ON DELETE CASCADE,
  
  -- Sender Info
  sender_type TEXT NOT NULL, -- 'user' or 'admin'
  sender_id UUID, -- user_id or admin_id
  sender_username TEXT NOT NULL,
  sender_role TEXT,
  
  -- Message Content
  message TEXT NOT NULL,
  
  -- Read Status (untuk notification)
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE: feedback_attachments (File uploads)
CREATE TABLE IF NOT EXISTS feedback_attachments (
  id BIGSERIAL PRIMARY KEY,
  feedback_id BIGINT NOT NULL REFERENCES user_feedbacks(id) ON DELETE CASCADE,
  reply_id BIGINT REFERENCES feedback_replies(id) ON DELETE CASCADE,
  
  -- File Info
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image/png', 'image/jpeg', etc.
  file_size BIGINT, -- in bytes
  file_url TEXT NOT NULL, -- Supabase storage URL or base64
  
  -- Uploader Info
  uploaded_by TEXT NOT NULL,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- user_feedbacks indexes
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_user_id ON user_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_status ON user_feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_priority ON user_feedbacks(priority);
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_created_at ON user_feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_updated_at ON user_feedbacks(updated_at DESC);

-- feedback_replies indexes
CREATE INDEX IF NOT EXISTS idx_feedback_replies_feedback_id ON feedback_replies(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_replies_created_at ON feedback_replies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_replies_is_read ON feedback_replies(is_read);
CREATE INDEX IF NOT EXISTS idx_feedback_replies_sender_type ON feedback_replies(sender_type);

-- feedback_attachments indexes
CREATE INDEX IF NOT EXISTS idx_feedback_attachments_feedback_id ON feedback_attachments(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_attachments_reply_id ON feedback_attachments(reply_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS
ALTER TABLE user_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_feedbacks;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON feedback_replies;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON feedback_attachments;

-- Create permissive policies (allow all authenticated users)
CREATE POLICY "Allow all operations for authenticated users" 
  ON user_feedbacks 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" 
  ON feedback_replies 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" 
  ON feedback_attachments 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- ========================================
-- FUNCTIONS & TRIGGERS
-- ========================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on user_feedbacks
DROP TRIGGER IF EXISTS trigger_update_feedback_timestamp ON user_feedbacks;
CREATE TRIGGER trigger_update_feedback_timestamp
  BEFORE UPDATE ON user_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

-- Function: Update last_reply_at when new reply added
CREATE OR REPLACE FUNCTION update_last_reply_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_feedbacks 
  SET last_reply_at = NOW(),
      status = CASE 
        WHEN status = 'pending' THEN 'replied'
        ELSE status
      END
  WHERE id = NEW.feedback_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update last_reply_at
DROP TRIGGER IF EXISTS trigger_update_last_reply ON feedback_replies;
CREATE TRIGGER trigger_update_last_reply
  AFTER INSERT ON feedback_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_last_reply_at();

-- ========================================
-- VERIFICATION
-- ========================================

-- Verify tables created
SELECT 
  table_name, 
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('user_feedbacks', 'feedback_replies', 'feedback_attachments')
ORDER BY table_name;

-- Verify indexes created
SELECT 
  tablename, 
  indexname
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename IN ('user_feedbacks', 'feedback_replies', 'feedback_attachments')
ORDER BY tablename, indexname;

