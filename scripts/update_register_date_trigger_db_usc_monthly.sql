-- ============================================================================
-- UPDATE TRIGGER untuk register_date di db_usc_monthly
-- ============================================================================

DROP TRIGGER IF EXISTS trg_set_register_date ON public.db_usc_monthly;
DROP FUNCTION IF EXISTS fn_set_register_date();
CREATE OR REPLACE FUNCTION fn_set_register_date()
RETURNS TRIGGER AS $$
DECLARE
  reg_date DATE;
BEGIN
  -- Jika user_unique tidak ada, biarkan register_date NULL
  IF NEW.user_unique IS NULL THEN
    -- Jika register_date sudah di-set manual, biarkan
    -- Jika tidak, set NULL
    IF NEW.register_date IS NULL THEN
      NEW.register_date := NULL;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Jika register_date sudah di-set manual (tidak NULL), biarkan (allow override)
  -- Tapi untuk safety, kita tetap lookup dari rs_blue_whale_usc jika belum di-set
  IF NEW.register_date IS NOT NULL THEN
    RETURN NEW; -- User sudah set manual, biarkan
  END IF;
  
  -- Cari register_date dari rs_blue_whale_usc untuk user_unique ini
  -- Pakai MIN untuk konsistensi (kalau ada multiple rows)
  SELECT MIN(register_date) INTO reg_date
  FROM public.rs_blue_whale_usc
  WHERE user_unique = NEW.user_unique
    AND register_date IS NOT NULL;
  
  -- Set register_date untuk row baru/update
  NEW.register_date := reg_date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_register_date
BEFORE INSERT OR UPDATE OF user_unique, register_date
ON public.db_usc_monthly
FOR EACH ROW
EXECUTE FUNCTION fn_set_register_date();
