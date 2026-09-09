-- =====================================================================
-- Migration 040 : Suivi financier du projet (lecture staff)
-- =====================================================================
-- Trois colonnes saisies par le staff dans le formulaire projet. Tout le
-- reste (encaisse, reste a encaisser, cout testeurs engage / paye / a
-- payer, marge) est CALCULE a la volee dans l'onglet Finances a partir de
-- ces colonnes et de `tester_payouts`. Aucune table, aucun trigger.
--
-- Convention : montants en CENTIMES (INTEGER), comme tester_payouts et
-- base_reward_cents (cf. PROJECT_CONTEXT C6). Les dates d'encaissement
-- sont des DATE (pas d'heure) : c'est une date de virement recu.
-- Regle metier unique : 50 % a la commande, 50 % a la remise du rapport
-- (src/lib/cta-links.ts, FAQ /entreprises). L'acompte et le solde sont
-- donc chacun la moitie du devis ; on ne stocke pas deux montants.
-- =====================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS quote_amount_cents INTEGER
    CHECK (quote_amount_cents IS NULL OR quote_amount_cents >= 0),
  ADD COLUMN IF NOT EXISTS deposit_paid_at DATE,
  ADD COLUMN IF NOT EXISTS balance_paid_at DATE;

COMMENT ON COLUMN public.projects.quote_amount_cents IS
  'Montant du devis HT accepte par le client, en centimes. NULL = pas encore chiffre.';
COMMENT ON COLUMN public.projects.deposit_paid_at IS
  'Date d''encaissement de l''acompte (50 % du devis). NULL = non encaisse.';
COMMENT ON COLUMN public.projects.balance_paid_at IS
  'Date d''encaissement du solde (50 % du devis, a la remise du rapport). NULL = non encaisse.';

-- Verification :
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'projects'
--     AND column_name IN ('quote_amount_cents', 'deposit_paid_at', 'balance_paid_at');
