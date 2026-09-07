-- =====================================================================
-- Migration 037 : Relance automatique des profils incomplets
-- =====================================================================
-- Cron /api/cron/profile-reminders (via daily-reminders) : relance par email
-- les testeurs en status='pending' dont le profil n'est pas complet.
--
-- Idempotence :
--   - profile_reminder_sent_at : cooldown (pas plus d'une relance tous les
--     7 jours), mis a jour APRES envoi reussi.
--   - profile_reminder_count   : plafond (3 relances max, puis on arrete).
-- =====================================================================

ALTER TABLE public.testers
  ADD COLUMN IF NOT EXISTS profile_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_reminder_count   INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.testers.profile_reminder_sent_at IS
  'Idempotence cron profile-reminders : date de la derniere relance profil incomplet. NULL = jamais.';
COMMENT ON COLUMN public.testers.profile_reminder_count IS
  'Nombre de relances profil incomplet deja envoyees (plafond dans le cron).';

-- Index partiel : le cron ne regarde que les pending non completes.
CREATE INDEX IF NOT EXISTS idx_testers_profile_reminder
  ON public.testers (profile_reminder_sent_at, created_at)
  WHERE status = 'pending' AND profile_completed = false;

-- =====================================================================
-- Verification post-application :
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name='testers' AND column_name LIKE 'profile_reminder%';
--   -- doit renvoyer 2 lignes
-- =====================================================================
