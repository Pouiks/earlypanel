-- =====================================================================
-- Migration 044 : Retention RGPD des comptes testeurs (avertissement +
-- anonymisation automatique)
-- =====================================================================
-- La politique de confidentialite promet : donnees de profil conservees
-- 3 ans apres la derniere connexion. La migration 043 a rendu cette date
-- mesurable (last_seen_at). Celle-ci donne au cron /api/cron/retention
-- ses deux colonnes d'idempotence :
--
--   - retention_warning_sent_at : email « votre compte sera anonymise dans
--     90 jours » envoye. Re-envoye seulement si le testeur est revenu
--     depuis (warning plus ancien que la derniere activite) puis redevenu
--     inactif : une nouvelle periode d'inactivite = un nouvel avertissement.
--   - anonymized_at : anonymisation effectuee (one-shot, jamais remise a
--     NULL). Identite, coordonnees, date de naissance et IBAN effaces,
--     compte auth supprime. Les ecritures de paiement, les reponses aux
--     missions et les PDF de NDA signes sont conserves (obligations
--     comptables et preuve contractuelle), rattaches a un id anonyme.
--
-- Un testeur avec un versement encore du (pending/approved/failed > 0 €)
-- n'est PAS anonymise : effacer son IBAN rendrait la dette impayable. Le
-- cron le remonte au staff dans son compte-rendu.
-- =====================================================================

ALTER TABLE public.testers
  ADD COLUMN IF NOT EXISTS retention_warning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anonymized_at             TIMESTAMPTZ;

COMMENT ON COLUMN public.testers.retention_warning_sent_at IS
  'Cron retention : date du dernier email d''avertissement (anonymisation dans 90 j). NULL = jamais averti.';
COMMENT ON COLUMN public.testers.anonymized_at IS
  'Cron retention : compte anonymise (identite/coordonnees/IBAN effaces, auth supprime). NULL = compte nominatif.';

-- Le cron ne regarde que les comptes encore nominatifs, tries par activite.
CREATE INDEX IF NOT EXISTS idx_testers_retention
  ON public.testers (last_seen_at, created_at)
  WHERE anonymized_at IS NULL;

-- =====================================================================
-- Verification post-application :
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'testers'
--     AND column_name IN ('retention_warning_sent_at', 'anonymized_at');
-- Dry-run du cron (aucune ecriture) :
--   curl -H "Authorization: Bearer $CRON_SECRET" \
--     "https://www.earlypanel.fr/api/cron/retention?dry_run=1"
-- =====================================================================
