-- =====================================================================
-- Migration 035 : Campagne de disponibilité testeur
-- =====================================================================
-- Permet de savoir, à la demande, quels testeurs sont encore disponibles
-- (fenêtre datée) et d'offrir un opt-out volontaire réversible.
--
-- IMPORTANT : `available_until` est une DISPONIBILITÉ DATÉE, distincte de
-- `availability` (fréquence '1-2'/'3-5'/'5+', migration 001). Ne pas confondre.
-- =====================================================================

-- 1) Colonnes de disponibilité temporelle + idempotence de campagne
ALTER TABLE public.testers
  ADD COLUMN IF NOT EXISTS available_until            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS availability_responded_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS availability_check_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.testers.available_until IS
  'Fenetre de disponibilite confirmee (now()+90j au clic "Oui"). NULL ou passe = non confirme. NE PAS confondre avec `availability` (frequence).';
COMMENT ON COLUMN public.testers.availability_responded_at IS
  'Date de la derniere reponse du testeur a une campagne de disponibilite (Oui ou gestion).';
COMMENT ON COLUMN public.testers.availability_check_sent_at IS
  'Idempotence campagne : date du dernier email de relance de disponibilite envoye. NULL = jamais.';

-- 2) Ajout de la valeur 'inactive' au CHECK sur `status`
-- La contrainte est definie inline (001:26) donc auto-nommee par Postgres
-- (typiquement `testers_status_check`). On la retrouve dynamiquement pour
-- etre robuste, on la drop, puis on la recree avec 'inactive'.
-- Idempotent : au re-run, la contrainte (desormais nommee) est retrouvee et
-- recreee a l'identique.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.testers'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%IN%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.testers DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE public.testers
    ADD CONSTRAINT testers_status_check
    CHECK (status IN ('pending', 'active', 'suspended', 'rejected', 'inactive'));
END $$;

-- 3) Index pour trouver vite les testeurs "disponibles confirmes" quand une
--    offre client tombe (filtre staff `available=confirmed`).
CREATE INDEX IF NOT EXISTS idx_testers_available_confirmed
  ON public.testers (available_until)
  WHERE status = 'active';

-- =====================================================================
-- Verification post-application (a lancer dans le SQL Editor) :
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid='public.testers'::regclass AND contype='c'
--     AND pg_get_constraintdef(oid) ILIKE '%status%';
--   -- doit contenir 'inactive'
-- =====================================================================
