-- =====================================================================
-- Migration 032 : RPC decrement_missions_completed
-- =====================================================================
-- Inversion de la logique d'incrementation de testers.missions_completed.
--
-- Avant : increment a la validation staff (rating >= 3 && !sloppy).
-- Apres : increment a la soumission par le testeur (feedback immediat),
--         decrement si le staff rejette finalement (sloppy ou rating < 3).
--
-- Cette RPC est le miroir atomique de increment_missions_completed
-- (migration 019). Memes garanties : SECURITY DEFINER, granted to
-- service_role uniquement.
--
-- Cas limite : si missions_completed est deja 0 (ex: bug, manipulation
-- manuelle), on ne descend pas en negatif. On clamp a 0.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.decrement_missions_completed(p_tester_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.testers
  SET missions_completed = GREATEST(COALESCE(missions_completed, 0) - 1, 0)
  WHERE id = p_tester_id
  RETURNING missions_completed INTO v_count;

  IF v_count IS NULL THEN
    RAISE EXCEPTION 'Tester % introuvable', p_tester_id;
  END IF;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrement_missions_completed(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_missions_completed(UUID) TO service_role;

COMMENT ON FUNCTION public.decrement_missions_completed(UUID) IS
'Decremente atomiquement testers.missions_completed avec clamp a 0.
 Utilisee quand le staff rejette une soumission (rating<3 ou sloppy)
 apres que le compteur ait deja ete incremente a la soumission.';
