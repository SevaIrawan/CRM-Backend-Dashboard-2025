-- Materialized View: blue_whale_usc_monthly_tier_mv
-- Fokus tier & potential saja (tanpa movement) sesuai logika Excel.
-- Breakpoints:
--   DA  : 65->5, 200->10, 700->25, 1500->35, 6000->50, 15000->65, 30000->80, 100000->100
--   GGR : 30->5, 100->10, 250->25, 1000->35, 4000->50, 6500->65, 16500->80, 20000->100
--   PF  : 3->15, 6->50, 12->100   (PF = deposit_cases / days_active)
--   ATV : 20->15, 50->50, 100->100
--   WR  : 0.15->15, 0.30->50, 0.50->100  (proporsi)
-- Bobot total_score: DA 30%, GGR 40%, PF 15%, ATV 15%, WR 0%
-- Bobot potential_score: PF 25%, ATV 65%, WR 10%
-- ND_P: deposit_cases=1 & ATV>=20

CREATE MATERIALIZED VIEW public.blue_whale_usc_monthly_tier_mv AS
WITH monthly AS (
    SELECT
        bw.user_unique,
        bw.unique_code,
        bw.user_name,
        bw.line,
        bw.currency,
        date_trunc('month', bw.date)::date AS month_start,
        bw.year,
        bw.month,
        SUM(bw.deposit_cases)      AS deposit_cases,
        SUM(bw.deposit_amount)     AS deposit_amount,
        SUM(bw.withdraw_cases)     AS withdraw_cases,
        SUM(bw.withdraw_amount)    AS withdraw_amount,
        SUM(bw.bonus)              AS bonus,
        SUM(bw.add_bonus)          AS add_bonus,
        SUM(bw.deduct_bonus)       AS deduct_bonus,
        SUM(bw.add_transaction)    AS add_transaction,
        SUM(bw.deduct_transaction) AS deduct_transaction,
        SUM(bw.cases_adjustment)   AS cases_adjustment,
        SUM(bw.cases_bets)         AS cases_bets,
        SUM(bw.bets_amount)        AS bets_amount,
        SUM(bw.valid_amount)       AS valid_amount,
        SUM(bw.ggr)                AS ggr,
        SUM(bw.net_profit)         AS net_profit,
        MIN(bw.register_date)      AS register_date,
        MIN(bw.first_deposit_date) AS first_deposit_date,
        MAX(bw.first_deposit_amount) AS first_deposit_amount,
        MAX(bw.traffic)            AS traffic,
        MAX(bw.last_activity_days) AS last_activity_days,
        MAX(bw.last_deposit_date)  AS last_deposit_date,
        COUNT(DISTINCT bw.date) FILTER (WHERE bw.deposit_cases > 0) AS days_active,
        COUNT(DISTINCT bw.date) FILTER (WHERE bw.deposit_cases = 0) AS days_inactive
    FROM public.blue_whale_usc bw
    WHERE bw.currency = 'USC'
    GROUP BY bw.user_unique, bw.unique_code, bw.user_name, bw.line, bw.currency, date_trunc('month', bw.date), bw.year, bw.month
    HAVING SUM(bw.deposit_cases) > 0
),
kpi AS (
    SELECT
        m.*,
        CASE WHEN m.deposit_cases > 0 THEN m.deposit_amount / m.deposit_cases ELSE 0 END AS atv,
        CASE WHEN m.days_active   > 0 THEN m.deposit_cases::numeric / m.days_active ELSE 0 END AS purchase_frequency,
        CASE WHEN m.deposit_amount > 0 THEN m.ggr / m.deposit_amount ELSE 0 END AS winrate_calc
    FROM monthly m
),
scored AS (
    SELECT
        k.*,
        CASE
            WHEN k.deposit_amount <= 0 THEN 0
            WHEN k.deposit_amount < 65       THEN (k.deposit_amount / 65.0) * 5
            WHEN k.deposit_amount < 200      THEN 5  + (k.deposit_amount-65   )/(200-65   )*(10-5)
            WHEN k.deposit_amount < 700      THEN 10 + (k.deposit_amount-200  )/(700-200 )*(25-10)
            WHEN k.deposit_amount < 1500     THEN 25 + (k.deposit_amount-700  )/(1500-700)*(35-25)
            WHEN k.deposit_amount < 6000     THEN 35 + (k.deposit_amount-1500 )/(6000-1500)*(50-35)
            WHEN k.deposit_amount < 15000    THEN 50 + (k.deposit_amount-6000 )/(15000-6000)*(65-50)
            WHEN k.deposit_amount < 30000    THEN 65 + (k.deposit_amount-15000)/(30000-15000)*(80-65)
            WHEN k.deposit_amount < 100000   THEN 80 + (k.deposit_amount-30000)/(100000-30000)*(100-80)
            ELSE 100
        END AS score_da,
        CASE
            WHEN k.ggr <= 0 THEN 0
            WHEN k.ggr < 30        THEN (k.ggr / 30.0) * 5
            WHEN k.ggr < 100       THEN 5  + (k.ggr-30   )/(100-30   )*(10-5)
            WHEN k.ggr < 250       THEN 10 + (k.ggr-100  )/(250-100 )*(25-10)
            WHEN k.ggr < 1000      THEN 25 + (k.ggr-250  )/(1000-250)*(35-25)
            WHEN k.ggr < 4000      THEN 35 + (k.ggr-1000 )/(4000-1000)*(50-35)
            WHEN k.ggr < 6500      THEN 50 + (k.ggr-4000 )/(6500-4000)*(65-50)
            WHEN k.ggr < 16500     THEN 65 + (k.ggr-6500 )/(16500-6500)*(80-65)
            WHEN k.ggr < 20000     THEN 80 + (k.ggr-16500)/(20000-16500)*(100-80)
            ELSE 100
        END AS score_ggr,
        CASE
            WHEN k.purchase_frequency <= 0 THEN 0
            WHEN k.purchase_frequency < 3    THEN (k.purchase_frequency / 3.0) * 15
            WHEN k.purchase_frequency < 6    THEN 15 + (k.purchase_frequency-3)/(6-3)*(50-15)
            WHEN k.purchase_frequency < 12   THEN 50 + (k.purchase_frequency-6)/(12-6)*(100-50)
            ELSE 100
        END AS score_pf,
        CASE
            WHEN k.atv <= 0 THEN 0
            WHEN k.atv < 20    THEN (k.atv / 20.0) * 15
            WHEN k.atv < 50    THEN 15 + (k.atv-20)/(50-20)*(50-15)
            WHEN k.atv < 100   THEN 50 + (k.atv-50)/(100-50)*(100-50)
            ELSE 100
        END AS score_atv,
        CASE
            WHEN k.winrate_calc <= 0 THEN 0
            WHEN k.winrate_calc < 0.15 THEN (k.winrate_calc / 0.15) * 15
            WHEN k.winrate_calc < 0.30 THEN 15 + (k.winrate_calc-0.15)/(0.30-0.15)*(50-15)
            WHEN k.winrate_calc < 0.50 THEN 50 + (k.winrate_calc-0.30)/(0.50-0.30)*(100-50)
            ELSE 100
        END AS score_wr
    FROM kpi k
),
base AS (
    SELECT
        s.*,
        (COALESCE(s.score_da,0) * 0.30
       + COALESCE(s.score_ggr,0) * 0.40
       + COALESCE(s.score_pf,0) * 0.15
       + COALESCE(s.score_atv,0) * 0.15
       + COALESCE(s.score_wr,0) * 0.00) AS total_score,
        (COALESCE(s.score_pf,0) * 0.25
       + COALESCE(s.score_atv,0) * 0.65
       + COALESCE(s.score_wr,0) * 0.10) AS potential_score
    FROM scored s
),
canon AS (
    SELECT
        b.*,
        -- lookup tier_by & min_score_by
        (SELECT t.tier_label FROM public.tier_mpv_config t WHERE t.min_score <= b.total_score ORDER BY t.min_score DESC LIMIT 1) AS tier_by,
        (SELECT t.min_score FROM public.tier_mpv_config t WHERE t.min_score <= b.total_score ORDER BY t.min_score DESC LIMIT 1) AS tier_by_min_score,
        -- tier3_min
        (SELECT t.min_score FROM public.tier_mpv_config t WHERE t.tier_label = 'Tier 3' LIMIT 1) AS tier3_min,
        -- potential lookup
        (SELECT p.potential_label FROM public.tier_potential_config p WHERE p.min_pot_score <= b.potential_score ORDER BY p.min_pot_score DESC LIMIT 1) AS p_by,
        (SELECT p.min_pot_score FROM public.tier_potential_config p WHERE p.min_pot_score <= b.potential_score ORDER BY p.min_pot_score DESC LIMIT 1) AS p_by_min_score,
        (SELECT MIN(p.min_pot_score) FROM public.tier_potential_config p WHERE p.potential_label = 'P1') AS p1_min,
        -- final tier logic per Excel
        CASE
            WHEN b.total_score < COALESCE((SELECT t.min_score FROM public.tier_mpv_config t WHERE t.tier_label = 'Tier 3' LIMIT 1),0)
                 THEN CASE
                        WHEN b.deposit_cases = 1 AND b.atv >= 20 THEN 'ND_P'
                        WHEN b.potential_score >= COALESCE((SELECT MIN(p.min_pot_score) FROM public.tier_potential_config p WHERE p.potential_label = 'P1'),0)
                             THEN (SELECT p.potential_label FROM public.tier_potential_config p WHERE p.min_pot_score <= b.potential_score ORDER BY p.min_pot_score DESC LIMIT 1)
                        WHEN b.atv >= 20 THEN 'P1'
                        ELSE (SELECT t.tier_label FROM public.tier_mpv_config t WHERE t.min_score <= b.total_score ORDER BY t.min_score DESC LIMIT 1)
                      END
            ELSE (SELECT t.tier_label FROM public.tier_mpv_config t WHERE t.min_score <= b.total_score ORDER BY t.min_score DESC LIMIT 1)
        END AS tier_name,
        CASE
            WHEN b.total_score < COALESCE((SELECT t.min_score FROM public.tier_mpv_config t WHERE t.tier_label = 'Tier 3' LIMIT 1),0)
                 THEN CASE
                        WHEN b.deposit_cases = 1 AND b.atv >= 20 THEN 0
                        WHEN b.potential_score >= COALESCE((SELECT MIN(p.min_pot_score) FROM public.tier_potential_config p WHERE p.potential_label = 'P1'),0)
                             THEN (SELECT p.min_pot_score FROM public.tier_potential_config p WHERE p.min_pot_score <= b.potential_score ORDER BY p.min_pot_score DESC LIMIT 1)
                        WHEN b.atv >= 20 THEN COALESCE((SELECT MIN(p.min_pot_score) FROM public.tier_potential_config p WHERE p.potential_label = 'P1'),0)
                        ELSE (SELECT t.min_score FROM public.tier_mpv_config t WHERE t.min_score <= b.total_score ORDER BY t.min_score DESC LIMIT 1)
                      END
            ELSE (SELECT t.min_score FROM public.tier_mpv_config t WHERE t.min_score <= b.total_score ORDER BY t.min_score DESC LIMIT 1)
        END AS tier_min_score,
        -- potential label/min for reference (unchanged)
        CASE
            WHEN b.deposit_cases = 1 AND b.atv >= 20 THEN 'ND_P'
            ELSE (SELECT p.potential_label FROM public.tier_potential_config p WHERE p.min_pot_score <= b.potential_score ORDER BY p.min_pot_score DESC LIMIT 1)
        END AS potential_label,
        CASE
            WHEN b.deposit_cases = 1 AND b.atv >= 20 THEN 0
            ELSE (SELECT p.min_pot_score FROM public.tier_potential_config p WHERE p.min_pot_score <= b.potential_score ORDER BY p.min_pot_score DESC LIMIT 1)
        END AS potential_min_score
    FROM base b
),
canon_ranked AS (
    SELECT DISTINCT ON (c.user_unique, c.month_start) c.*
    FROM canon c
    ORDER BY c.user_unique, c.month_start, c.total_score DESC NULLS LAST
),
movement AS (
    SELECT
        cr.*,
        LAG(cr.tier_name)      OVER w AS prev_tier_name,
        LAG(cr.tier_min_score) OVER w AS prev_tier_min_score,
        MAX(CASE WHEN cr.tier_name IS NOT NULL THEN 1 END) OVER (PARTITION BY cr.user_unique) AS any_history,
        MAX(CASE WHEN cr.tier_name IS NOT NULL THEN 1 END)
            OVER (PARTITION BY cr.user_unique ORDER BY cr.month_start
                  ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS history_before
    FROM canon_ranked cr
    WINDOW w AS (PARTITION BY cr.user_unique ORDER BY cr.month_start)
),
final_movement AS (
    SELECT
        m.*,
        CASE
          WHEN m.tier_name IS NOT NULL AND m.prev_tier_name IS NOT NULL THEN
            CASE
              WHEN m.tier_min_score > COALESCE(m.prev_tier_min_score, m.tier_min_score) THEN 'Upgrade'
              WHEN m.tier_min_score < COALESCE(m.prev_tier_min_score, m.tier_min_score) THEN 'Downgrade'
              ELSE 'Stable'
            END
          WHEN m.tier_name IS NOT NULL AND m.prev_tier_name IS NULL THEN
            CASE
              WHEN COALESCE(m.history_before,0) = 1 THEN 'Reactivation'
              ELSE 'New Member'
            END
          WHEN m.tier_name IS NULL AND m.prev_tier_name IS NOT NULL THEN 'Churn'
          WHEN m.tier_name IS NULL AND m.prev_tier_name IS NULL THEN
            CASE
              WHEN COALESCE(m.history_before,0) = 1 THEN 'Inactive'
              WHEN COALESCE(m.any_history,0) = 0 THEN 'No Data'
              ELSE 'Inactive'
            END
          ELSE 'No Data'
        END AS movement_status
    FROM movement m
)
SELECT * FROM final_movement;
