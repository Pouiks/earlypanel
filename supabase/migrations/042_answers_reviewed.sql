-- =====================================================================
-- Migration 042 : Marquage « lu » des reponses (depouillement)
-- =====================================================================
-- Aide a la relecture question par question : le staff replie une reponse
-- une fois lue. Persiste en base (et non dans le navigateur) pour avoir
-- une trace par questionnaire rempli : quelle reponse a ete lue, quand,
-- par qui. Aucun effet sur le scoring, la notation ni le paiement.
-- =====================================================================

ALTER TABLE public.project_tester_answers
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.project_tester_answers.reviewed_at IS
  'Reponse marquee lue par le staff (depouillement). NULL = pas encore lue. Simple aide de relecture, sans effet metier.';

-- Verification :
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'project_tester_answers' AND column_name IN ('reviewed_at', 'reviewed_by');
