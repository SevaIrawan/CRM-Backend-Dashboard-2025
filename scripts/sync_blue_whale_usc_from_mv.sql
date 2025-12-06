-- Sync tier columns from MV (final_movement) to base table
-- Keys: (user_unique, year, month)
-- Assumes columns tier_label_mpv, prev_tier_label,
--         last_active_tier_before_current, movement_status
-- already exist in public.blue_whale_usc (see alter script).

-- Optional helper index to speed up join on base
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS blue_whale_usc_uid_month_year_idx
--   ON public.blue_whale_usc (user_unique, year, month);

WITH src AS (
  SELECT DISTINCT ON (m.user_unique, m.year, m.month)
    m.user_unique,
    m.year,
    m.month,
    m.tier_name            AS tier_label_mpv,
    m.prev_tier_name       AS prev_tier_label,
    NULL::text             AS last_active_tier_before_current,
    m.movement_status
  FROM public.blue_whale_usc_monthly_tier_mv m
  ORDER BY m.user_unique, m.year, m.month, m.month_start DESC
)
UPDATE public.blue_whale_usc b
SET tier_name = s.tier_label_mpv,
    prev_tier_name = s.prev_tier_label,
    last_active_tier_before_current = s.last_active_tier_before_current,
    movement_status = s.movement_status
FROM src s
WHERE b.user_unique = s.user_unique
  AND b.year = s.year
  AND b.month = s.month;

