-- =====================================================================
-- Migration 025 : tracabilite NDA + tracking des relances email
-- =====================================================================
-- Objectifs :
--   1) Renforcer la tracabilite legale de la signature NDA en stockant la
--      date d'envoi de l'email NDA initial (separation entre "envoi" et
--      "envoi sous email", utile en preuve si conteste).
--   2) Permettre aux crons de relance d'etre IDEMPOTENTS : sans colonne
--      dediee, un cron qui tourne plusieurs fois par jour spammerait les
--      testeurs. On stocke la derniere date de relance pour ne pas
--      renvoyer trop tot.
--
-- Note : on ne stocke PAS un compteur de relances, car le cron NDA fonctionne
-- par "delai depuis derniere relance" (ex: max 1 relance / 3 jours). Pour le
-- cron projet, on relance une seule fois a mi-parcours, donc un timestamp
-- suffit a savoir si la relance a deja ete faite.

ALTER TABLE public.project_testers
  ADD COLUMN IF NOT EXISTS nda_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS project_midway_reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_project_testers_nda_reminder
  ON public.project_testers(status, nda_sent_at, nda_reminder_sent_at)
  WHERE status = 'nda_sent';

CREATE INDEX IF NOT EXISTS idx_project_testers_midway_reminder
  ON public.project_testers(status, project_midway_reminder_sent_at)
  WHERE status IN ('nda_signed', 'invited', 'in_progress');

COMMENT ON COLUMN public.project_testers.nda_reminder_sent_at IS
'Derniere date d''envoi d''un email de relance pour le NDA non signe (cron). NULL = aucune relance envoyee.';
COMMENT ON COLUMN public.project_testers.project_midway_reminder_sent_at IS
'Date d''envoi du rappel a mi-parcours du projet. NULL = pas encore envoye. Une seule relance par projet/testeur.';
