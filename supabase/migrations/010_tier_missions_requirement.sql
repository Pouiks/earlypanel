-- Aligner le trigger de tier sur les criteres affiches dans l'UI :
-- premium = quality_score >= 80 ET missions_completed >= 5
-- expert  = quality_score >= 65 ET missions_completed >= 2
-- sinon   = standard

CREATE OR REPLACE FUNCTION public.recalculate_tester_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quality_score < 0 THEN NEW.quality_score := 0; END IF;
  IF NEW.quality_score > 100 THEN NEW.quality_score := 100; END IF;

  IF NEW.quality_score >= 80 AND NEW.missions_completed >= 5 THEN
    NEW.tier := 'premium';
  ELSIF NEW.quality_score >= 65 AND NEW.missions_completed >= 2 THEN
    NEW.tier := 'expert';
  ELSE
    NEW.tier := 'standard';
  END IF;

  IF NEW.quality_score < 40 AND OLD.status NOT IN ('rejected') THEN
    NEW.status := 'suspended';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Le trigger existant se declenche sur quality_score ; il faut aussi
-- recalculer quand missions_completed change.
DROP TRIGGER IF EXISTS trg_recalc_tier ON public.testers;
CREATE TRIGGER trg_recalc_tier
  BEFORE UPDATE OF quality_score, missions_completed ON public.testers
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_tester_tier();
