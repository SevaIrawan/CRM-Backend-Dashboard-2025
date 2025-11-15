-- ============================================================
-- MAINTENANCE CONFIG TABLE
-- ============================================================
-- Purpose: Manage maintenance mode for the entire application
-- Features: Admin-controlled maintenance mode, customizable messages, countdown, background
-- ============================================================

-- Drop existing table if exists (for clean reinstall)
DROP TABLE IF EXISTS maintenance_config;

-- Create table
CREATE TABLE maintenance_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_maintenance_mode BOOLEAN DEFAULT false NOT NULL,
  maintenance_message TEXT DEFAULT 'We are currently performing maintenance. Please check back soon.' NOT NULL,
  maintenance_message_id TEXT DEFAULT 'Kami sedang melakukan pemeliharaan. Silakan kembali lagi nanti.' NOT NULL,
  countdown_enabled BOOLEAN DEFAULT false NOT NULL,
  countdown_datetime TIMESTAMP WITH TIME ZONE, -- Target datetime for countdown
  background_image_url TEXT, -- URL for custom background image
  background_color TEXT DEFAULT '#1a1a1a', -- Default dark background color
  text_color TEXT DEFAULT '#ffffff', -- Default text color
  show_logo BOOLEAN DEFAULT true NOT NULL,
  logo_url TEXT, -- Custom logo URL (optional)
  custom_html TEXT, -- Custom HTML content (optional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) -- Reference to users table (optional)
);

-- Create index for faster queries
CREATE INDEX idx_maintenance_config_mode ON maintenance_config(is_maintenance_mode);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_maintenance_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_maintenance_config_timestamp
  BEFORE UPDATE ON maintenance_config
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_config_timestamp();

-- ============================================================
-- SEED INITIAL DATA
-- ============================================================
-- Default: Maintenance mode OFF
-- ============================================================

-- Insert default maintenance config (OFF by default)
INSERT INTO maintenance_config (
  is_maintenance_mode,
  maintenance_message,
  maintenance_message_id,
  countdown_enabled,
  background_color,
  text_color,
  show_logo
) VALUES (
  false,
  'We are currently performing maintenance. Please check back soon.',
  'Kami sedang melakukan pemeliharaan. Silakan kembali lagi nanti.',
  false,
  '#1a1a1a',
  '#ffffff',
  true
);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify the data:

-- Check maintenance config
-- SELECT * FROM maintenance_config;

-- Check maintenance mode status
-- SELECT is_maintenance_mode, maintenance_message_id, countdown_enabled, countdown_datetime 
-- FROM maintenance_config;

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. Only ONE row should exist in this table (singleton pattern)
-- 2. Admin can toggle maintenance mode ON/OFF
-- 3. When maintenance mode is ON:
--    - All non-admin users are redirected to /maintenance page
--    - Admin users can bypass and access all pages
-- 4. Maintenance message supports both English and Indonesian
-- 5. Countdown is optional and can be enabled/disabled
-- 6. Background can be custom image or solid color
-- 7. Logo can be shown/hidden and customized

