-- =====================================================================
-- Migration 022 (G9) : RPC atomique pour appliquer les malus de cloture
-- =====================================================================
-- Sans verrou ligne, deux executions concurrentes de la cron `close-expired`
-- ou un GET mission detail simultane peuvent toutes deux lire malus_x_applied=false
-- et appliquer DEUX fois le malus de score. La RPC `apply_closure_malus_pt`
-- effectue le claim atomique du flag avec UPDATE...WHERE flag IS NOT TRUE
-- avant d'appliquer le delta de score, garantissant qu'un seul appelant
-- "gagne" la course.

CREATE OR REPLACE FUNCTION public.apply_closure_malus_pt(
  p_pt_id UUID,
  p_tester_id UUID,
  p_project_id UUID,
  p_kind TEXT,        -- 'nda_unsigned' ou 'deadline_exceeded'
  p_delta INTEGER,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_claimed INTEGER;
BEGIN
  IF p_kind = 'nda_unsigned' THEN
    UPDATE public.project_testers
    SET malus_nda_unsigned_applied = TRUE
    WHERE id = p_pt_id
      AND COALESCE(malus_nda_unsigned_applied, FALSE) = FALSE;
    GET DIAGNOSTICS v_claimed = ROW_COUNT;
  ELSIF p_kind = 'deadline_exceeded' THEN
    UPDATE public.project_testers
    SET malus_applied = TRUE
    WHERE id = p_pt_id
      AND COALESCE(malus_applied, FALSE) = FALSE;
    GET DIAGNOSTICS v_claimed = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'invalid_malus_kind: %', p_kind USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_claimed = 0 THEN
    -- Deja applique par un autre appelant.
    RETURN FALSE;
  END IF;

  -- Application du malus uniquement si le claim a reussi.
  PERFORM public.apply_score_change(p_tester_id, p_delta, p_reason, p_project_id);
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
