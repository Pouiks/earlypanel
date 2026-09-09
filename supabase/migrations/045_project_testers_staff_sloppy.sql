-- =====================================================================
-- Migration 045 : Persistance du rejet « travail bacle » (staff_sloppy)
-- =====================================================================
-- Jusqu'ici, le drapeau `sloppy` de la notation staff n'existait que dans
-- le body de PATCH /api/staff/projects/[id]/answers (score -20, paiement 0,
-- missions_completed decremente) et dans l'audit. Rien en base ne
-- permettait de retrouver quelles soumissions avaient ete refusees.
--
-- Le rapport client doit tenir la promesse de la page d'accueil : « les
-- reponses refusees ne sont pas comptabilisees dans votre rapport ».
-- Regle unique (src/lib/report-panel.ts) : une participation est VALIDEE
-- si status = 'completed' ET staff_rating >= 3 ET NOT staff_sloppy. Seules
-- les participations validees entrent dans le panel, les verbatims, les
-- resultats par scenario et l'annexe CSV.
--
-- Backfill : on relit l'audit immuable (action project_tester.rated,
-- metadata.sloppy = true) pour marquer les rejets deja prononces.
-- =====================================================================

ALTER TABLE public.project_testers
  ADD COLUMN IF NOT EXISTS staff_sloppy BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.project_testers.staff_sloppy IS
  'Travail bacle selon le staff (notation). Exclut la participation du rapport client. Ecrit a chaque PATCH answers.';

UPDATE public.project_testers pt
SET staff_sloppy = true
FROM public.staff_audit_log l
WHERE l.action = 'project_tester.rated'
  AND l.entity_id = pt.id
  AND (l.metadata ->> 'sloppy') = 'true'
  AND pt.staff_sloppy = false;

-- =====================================================================
-- Verification post-application :
--   SELECT count(*) FILTER (WHERE staff_sloppy) AS bacles, count(*) AS total
--   FROM public.project_testers WHERE status = 'completed';
-- =====================================================================
