-- =====================================================================
-- 019 — Increment atomique de missions_completed
-- Corrige la race condition du pattern read-then-write dans
-- src/app/api/staff/projects/[id]/answers/route.ts (BUG #9).
-- Si deux staff notent deux missions du meme testeur simultanement,
-- l'increment ci-dessous est garanti atomique cote DB.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.increment_missions_completed(p_tester_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.testers
  SET missions_completed = COALESCE(missions_completed, 0) + 1
  WHERE id = p_tester_id
  RETURNING missions_completed INTO v_count;

  IF v_count IS NULL THEN
    RAISE EXCEPTION 'Tester % introuvable', p_tester_id;
  END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_missions_completed(UUID) TO service_role;

COMMENT ON FUNCTION public.increment_missions_completed(UUID) IS
'Incremente atomiquement testers.missions_completed (corrige BUG #9 race condition).';
