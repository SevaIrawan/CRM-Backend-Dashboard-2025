-- Add tier movement columns to base table public.blue_whale_usc
-- Key uniqueness across tables: (user_unique, month, year)
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE public.blue_whale_usc
  ADD COLUMN IF NOT EXISTS tier_label_mpv text,
  ADD COLUMN IF NOT EXISTS prev_tier_label text,
  ADD COLUMN IF NOT EXISTS last_active_tier_before_current text,
  ADD COLUMN IF NOT EXISTS movement_status text;

-- Optional: enforce uniqueness on (user_unique, month, year) if not yet present
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS blue_whale_usc_uid_month_year_uidx
--   ON public.blue_whale_usc (user_unique, month, year);

