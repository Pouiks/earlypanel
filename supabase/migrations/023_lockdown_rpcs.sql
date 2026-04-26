-- =====================================================================
-- Migration 023 (M2) : lockdown des RPCs SECURITY DEFINER
-- =====================================================================
-- Toutes les fonctions PL/pgSQL declarees SECURITY DEFINER dans les
-- migrations 008/020/021/022 doivent :
--  1) avoir un search_path explicite (sinon un attaquant qui controle
--     une schema modifiable peut faire executer du code arbitraire au
--     contexte du proprietaire de la fonction)
--  2) ne pas etre executables par PUBLIC : seul le service_role doit
--     pouvoir les invoquer (les API Next.js, jamais le client anon).
--
-- Cette migration est idempotente : elle peut etre rejouee sans effet
-- de bord (ALTER FUNCTION et REVOKE/GRANT sont idempotents).

-- ---------------------------------------------------------------------
-- 008 : apply_score_change
-- ---------------------------------------------------------------------
ALTER FUNCTION public.apply_score_change(UUID, INTEGER, TEXT, UUID)
  SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.apply_score_change(UUID, INTEGER, TEXT, UUID)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_score_change(UUID, INTEGER, TEXT, UUID)
  TO service_role;

-- ---------------------------------------------------------------------
-- 020 : append_image_to_answer / remove_image_from_answer
-- ---------------------------------------------------------------------
ALTER FUNCTION public.append_image_to_answer(UUID, UUID, UUID, TEXT, INTEGER, INTEGER)
  SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.append_image_to_answer(UUID, UUID, UUID, TEXT, INTEGER, INTEGER)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_image_to_answer(UUID, UUID, UUID, TEXT, INTEGER, INTEGER)
  TO service_role;

ALTER FUNCTION public.remove_image_from_answer(UUID, UUID, UUID, TEXT)
  SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.remove_image_from_answer(UUID, UUID, UUID, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_image_from_answer(UUID, UUID, UUID, TEXT)
  TO service_role;

-- ---------------------------------------------------------------------
-- 021 : record_stripe_event / credit_tester_earnings / revert_tester_earnings
-- ---------------------------------------------------------------------
ALTER FUNCTION public.record_stripe_event(TEXT, TEXT)
  SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.record_stripe_event(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_stripe_event(TEXT, TEXT) TO service_role;

ALTER FUNCTION public.credit_tester_earnings(UUID, UUID, NUMERIC)
  SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.credit_tester_earnings(UUID, UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_tester_earnings(UUID, UUID, NUMERIC) TO service_role;

ALTER FUNCTION public.revert_tester_earnings(UUID)
  SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.revert_tester_earnings(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revert_tester_earnings(UUID) TO service_role;

-- ---------------------------------------------------------------------
-- 022 : apply_closure_malus_pt
-- ---------------------------------------------------------------------
ALTER FUNCTION public.apply_closure_malus_pt(UUID, UUID, UUID, TEXT, INTEGER, TEXT)
  SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.apply_closure_malus_pt(UUID, UUID, UUID, TEXT, INTEGER, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_closure_malus_pt(UUID, UUID, UUID, TEXT, INTEGER, TEXT)
  TO service_role;

-- ---------------------------------------------------------------------
-- 019 : increment_missions_completed (deja GRANT-only, on ajoute juste
-- le search_path par coherence).
-- ---------------------------------------------------------------------
ALTER FUNCTION public.increment_missions_completed(UUID)
  SET search_path = public, pg_temp;

COMMENT ON SCHEMA public IS
'Toutes les RPCs SECURITY DEFINER doivent avoir search_path explicite et etre limitees a service_role (M2).';
