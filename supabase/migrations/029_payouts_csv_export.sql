-- =====================================================================
-- Migration 029 : Export CSV des paiements testeur + indemnite par persona
-- =====================================================================
-- earlypanel n'est pas un outil de paiement. Cette migration prepare le
-- workflow d'EXPORT (CSV vers Qonto / banque) et de TRACABILITE (qui a ete
-- paye, dans quel batch, quand) — sans executer aucun virement nous-memes.
--
-- Workflow operationnel :
--   1. Staff filtre les payouts pending → bouton "Exporter ce lot CSV"
--   2. CSV genere avec IBAN dechiffres (1 fois, audit logge), tester_payouts
--      lignes marquees exported_at + sepa_batch_ref
--   3. Staff importe le CSV dans Qonto, fait le batch SEPA chez la banque
--   4. Staff revient, marque le batch comme "Paye" → status='paid', paid_at
--   5. Email de confirmation envoye aux testeurs
--
-- Cette migration ajoute :
--   - tester_payouts.exported_at + sepa_batch_ref (tracabilite des batchs)
--   - tester_personas.payout_per_mission_cents (montant ferme paye au testeur,
--     distinct de min/max_reward_cents qui restent un range "indicatif"
--     affiche au testeur a l'inscription)
--   - RPC decrypt_tester_ibans_batch pour dechiffrement par lot
-- =====================================================================

-- 1. Indemnite ferme par persona ----------------------------------------

ALTER TABLE public.tester_personas
  ADD COLUMN IF NOT EXISTS payout_per_mission_cents INTEGER NOT NULL DEFAULT 0
    CHECK (payout_per_mission_cents >= 0);

COMMENT ON COLUMN public.tester_personas.payout_per_mission_cents IS
  'Montant ferme verse au testeur par mission completee (en centimes).
   Distinct de min/max_reward_cents qui sont un range marketing affiche
   au testeur a l''inscription. Cette colonne est la verite de paiement.';

-- Backfill : pour les personas existants, si payout_per_mission_cents est
-- 0 et qu'un min_reward_cents existe, on le copie (estimation raisonnable
-- a calibrer manuellement par le staff plus tard).
UPDATE public.tester_personas
SET payout_per_mission_cents = min_reward_cents
WHERE payout_per_mission_cents = 0 AND min_reward_cents > 0;

-- 2. Tracabilite du batch d'export sur tester_payouts -------------------

ALTER TABLE public.tester_payouts
  ADD COLUMN IF NOT EXISTS exported_at TIMESTAMPTZ;

ALTER TABLE public.tester_payouts
  ADD COLUMN IF NOT EXISTS sepa_batch_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_tester_payouts_sepa_batch_ref
  ON public.tester_payouts(sepa_batch_ref) WHERE sepa_batch_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tester_payouts_status_eligibility
  ON public.tester_payouts(status, tester_id) WHERE status IN ('pending', 'approved');

COMMENT ON COLUMN public.tester_payouts.exported_at IS
  'Timestamp de l''export CSV. Une ligne ne peut etre incluse que dans UN seul
   batch — si exported_at est non-null, elle est deja partie en CSV. Reset
   uniquement si le batch est annule.';

COMMENT ON COLUMN public.tester_payouts.sepa_batch_ref IS
  'Reference du batch SEPA-import (ex: BATCH-2026-W18). Permet de marquer
   plusieurs payouts comme paye en un coup quand le batch a ete execute
   chez Qonto.';

-- 3. RPC : dechiffrement par lot d'IBAN pour l'export CSV --------------
--
-- Securite :
--   - SECURITY DEFINER + search_path lockdown
--   - REVOKE PUBLIC + GRANT service_role uniquement
--   - L'API staff appelante DOIT logger l'appel dans staff_audit_log avec
--     la liste des tester_id consultes (preuve d'acces aux donnees sensibles)
--
-- Retourne un set: (tester_id, iban_clear). Les testeurs sans payment_info
-- sont absents du resultat (pas d'erreur).

CREATE OR REPLACE FUNCTION public.decrypt_tester_ibans_batch(
  p_tester_ids UUID[],
  p_encryption_key TEXT
) RETURNS TABLE (tester_id UUID, iban_clear TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tpi.tester_id,
    pgp_sym_decrypt(tpi.iban_encrypted, p_encryption_key)::TEXT AS iban_clear
  FROM public.tester_payment_info tpi
  WHERE tpi.tester_id = ANY(p_tester_ids);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrypt_tester_ibans_batch(UUID[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrypt_tester_ibans_batch(UUID[], TEXT) TO service_role;

COMMENT ON FUNCTION public.decrypt_tester_ibans_batch(UUID[], TEXT) IS
  'Dechiffre les IBAN d''un lot de testeurs pour l''export CSV staff.
   Doit etre appelee UNIQUEMENT depuis l''API staff /api/staff/payouts/export
   et systematiquement avec un staff_audit_log entry detaillant la liste
   des tester_id et le sepa_batch_ref associe.';
