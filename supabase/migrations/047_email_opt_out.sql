-- =====================================================================
-- Migration 047 : Desabonnement de l'ensemble des communications
-- =====================================================================
-- Chaque email envoye a un testeur ou a un prospect porte en pied la ligne
-- « Si vous souhaitez vous desabonner de l'ensemble des communications,
-- cliquez ici » et les en-tetes List-Unsubscribe (desabonnement en un clic
-- depuis Gmail, Outlook, Apple Mail : RFC 8058). Le clic mene a /desabonnement,
-- qui enregistre l'opposition (art. 21 RGPD). Cf. src/lib/email-unsubscribe.ts.
--
-- 1) testers.email_opt_out_at : date du desabonnement d'un testeur.
--    NULL = recoit les communications. Effet : plus AUCUN email, sauf un lien
--    de connexion qu'il demande lui-meme ; plus invitable ; disponibilite
--    confirmee effacee. Le statut du compte n'est pas modifie (il peut se
--    connecter, voir ses missions et ses gains). Une nouvelle demande
--    n'ecrase pas la date existante. Remis a NULL uniquement par une action
--    explicite du testeur dans son espace (ou « Oui, je suis disponible »).
--
-- 2) email_opt_outs : desabonnement d'une adresse qui n'est pas un compte
--    testeur (prospect ayant recu l'exemple de rapport). On ne stocke que
--    l'empreinte SHA-256 de l'adresse normalisee (trim + minuscules), jamais
--    l'adresse en clair. Toute communication future vers un prospect doit
--    verifier cette table.
--
-- Chaque desabonnement est trace dans staff_audit_log
-- (action `email.unsubscribed`, IP + user-agent) : preuve de l'opposition.
-- =====================================================================

ALTER TABLE public.testers
  ADD COLUMN IF NOT EXISTS email_opt_out_at TIMESTAMPTZ;

COMMENT ON COLUMN public.testers.email_opt_out_at IS
  'Desabonnement de l''ensemble des communications. NULL = abonne. Remis a NULL uniquement par une action explicite du testeur.';

CREATE TABLE IF NOT EXISTS public.email_opt_outs (
  email_hash   TEXT PRIMARY KEY,               -- sha256 hex de l'adresse normalisee
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source       TEXT NOT NULL                   -- 'page' | 'one_click'
);

COMMENT ON TABLE public.email_opt_outs IS
  'Adresses (hors comptes testeurs) desabonnees de l''ensemble des communications. Empreinte SHA-256 uniquement.';

-- RLS fermee : acces via service_role uniquement.
ALTER TABLE public.email_opt_outs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_opt_outs_no_client_access ON public.email_opt_outs;
CREATE POLICY email_opt_outs_no_client_access
  ON public.email_opt_outs
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- =====================================================================
-- A APPLIQUER AVANT LE DEPLOIEMENT DU CODE : les envois refusent de partir
-- si la colonne est absente (fail-closed).
--
-- Verification post-application :
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'testers' AND column_name = 'email_opt_out_at';
--   -- doit renvoyer 1 ligne
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'email_opt_outs';
--   -- doit renvoyer true
-- =====================================================================
