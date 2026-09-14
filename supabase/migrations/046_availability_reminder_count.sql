-- ============================================================
-- Migration 046 : boucle de relance de disponibilite (3 relances, puis pause)
-- ============================================================
-- Meme mecanique que la relance profil (migration 037) :
--   - availability_check_sent_at  : cooldown entre deux relances (035)
--   - availability_check_count    : plafond (3 relances max), puis 14 jours
--     apres la derniere sans reponse : status active -> inactive.
--     Reversible : un clic « Oui » depuis l'email ou le bouton « Je suis
--     disponible » de l'espace testeur remet le compte actif (profil complet)
--     et le compteur a zero.
--
-- Le compteur est remis a 0 a chaque reponse (Oui ou gerer mon compte), pour
-- que la boucle reparte de zero au prochain cycle.

ALTER TABLE public.testers
  ADD COLUMN IF NOT EXISTS availability_check_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.testers.availability_check_count IS
  'Nombre de relances de disponibilite envoyees depuis la derniere reponse. 3 max, puis mise en pause (status inactive) par le cron. Remis a 0 a chaque reponse.';

-- Index partiel pour le cron : actifs jamais/peu relances, sans dispo en cours.
CREATE INDEX IF NOT EXISTS idx_testers_availability_loop
  ON public.testers (availability_check_count, availability_check_sent_at)
  WHERE status = 'active' AND profile_completed = true;
