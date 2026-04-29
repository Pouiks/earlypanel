-- =====================================================================
-- Migration 027 : tester_payment_info (IBAN + signature CGU)
-- =====================================================================
-- Objectifs :
--   1) Stocker l'IBAN d'un testeur de maniere chiffree au repos (pgcrypto
--      pgp_sym_encrypt). L'IBAN clair n'est jamais retourne par l'API : on
--      n'expose qu'un last4 + le pays + le titulaire.
--   2) Stocker la signature electronique des CGU au moment de la saisie
--      IBAN (eIDAS SES : timestamp + IP + UA + hash du contenu CGU). Sert
--      de preuve juridique pour autoriser les versements.
--   3) Isoler ces donnees sensibles dans une table dediee (RLS USING(false))
--      pour faciliter une purge RGPD ciblee et reduire la surface d'audit.
--
-- Cle de chiffrement : variable d'env applicative IBAN_ENCRYPTION_KEY,
-- jamais exposee cote client. La fonction RPC encrypt/decrypt prend la cle
-- en parametre (jamais loggee), accessible uniquement au service_role.
--
-- Mise a jour : on conserve un seul IBAN par testeur (PRIMARY KEY tester_id).
-- Une modification ecrase l'ancien et bumpe updated_at + nouvelle signature
-- CGU si la version a change.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.tester_payment_info (
  tester_id UUID PRIMARY KEY REFERENCES public.testers(id) ON DELETE CASCADE,

  iban_encrypted BYTEA NOT NULL,
  iban_last4 TEXT NOT NULL,
  iban_country CHAR(2) NOT NULL,
  bic TEXT,
  account_holder_name TEXT NOT NULL,
  fiscal_residence_country CHAR(2) NOT NULL,

  cgu_signed_at TIMESTAMPTZ NOT NULL,
  cgu_version TEXT NOT NULL,
  cgu_signature_ip INET NOT NULL,
  cgu_signature_user_agent TEXT NOT NULL,
  cgu_signature_hash TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT iban_last4_format CHECK (iban_last4 ~ '^[A-Z0-9]{4}$'),
  CONSTRAINT iban_country_format CHECK (iban_country ~ '^[A-Z]{2}$'),
  CONSTRAINT fiscal_country_format CHECK (fiscal_residence_country ~ '^[A-Z]{2}$')
);

COMMENT ON TABLE public.tester_payment_info IS
'IBAN chiffre + signature electronique des CGU. Donnees sensibles RGPD.
Acces exclusif via service_role + RPC. Jamais exposees cote client en clair.';

COMMENT ON COLUMN public.tester_payment_info.iban_encrypted IS
'IBAN chiffre via pgp_sym_encrypt(iban_clear, IBAN_ENCRYPTION_KEY). Decrypte uniquement au moment de la generation du fichier SEPA.';
COMMENT ON COLUMN public.tester_payment_info.iban_last4 IS
'4 derniers caracteres alphanumeriques de l''IBAN, pour affichage masque (ex: "...4521").';
COMMENT ON COLUMN public.tester_payment_info.cgu_signature_hash IS
'SHA-256 du texte CGU effectivement affiche au testeur au moment de la signature. Preuve d''integrite.';

-- Index utiles : recherche par pays fiscal pour DAS-2 / non-residents.
CREATE INDEX IF NOT EXISTS idx_tester_payment_info_fiscal_country
  ON public.tester_payment_info(fiscal_residence_country);

-- Trigger updated_at automatique
CREATE OR REPLACE FUNCTION public.tester_payment_info_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tester_payment_info_updated_at ON public.tester_payment_info;
CREATE TRIGGER trg_tester_payment_info_updated_at
  BEFORE UPDATE ON public.tester_payment_info
  FOR EACH ROW
  EXECUTE FUNCTION public.tester_payment_info_set_updated_at();

-- =====================================================================
-- RLS : aucun acces client. Service_role uniquement (pas de policy).
-- =====================================================================
ALTER TABLE public.tester_payment_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no_client_access" ON public.tester_payment_info;
CREATE POLICY "no_client_access" ON public.tester_payment_info
  FOR ALL USING (false);

-- =====================================================================
-- RPC : upsert avec chiffrement IBAN
-- =====================================================================
-- Prend l'IBAN en clair + la cle de chiffrement (passee par l'API depuis
-- l'env). Retourne uniquement le last4 + pays. La cle n'est jamais loggee.
-- L'IBAN clair n'est jamais retourne, jamais persiste en clair.
CREATE OR REPLACE FUNCTION public.upsert_tester_payment_info(
  p_tester_id UUID,
  p_iban_clear TEXT,
  p_iban_last4 TEXT,
  p_iban_country CHAR(2),
  p_bic TEXT,
  p_account_holder_name TEXT,
  p_fiscal_residence_country CHAR(2),
  p_cgu_version TEXT,
  p_cgu_signature_ip INET,
  p_cgu_signature_user_agent TEXT,
  p_cgu_signature_hash TEXT,
  p_encryption_key TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.tester_payment_info (
    tester_id,
    iban_encrypted,
    iban_last4,
    iban_country,
    bic,
    account_holder_name,
    fiscal_residence_country,
    cgu_signed_at,
    cgu_version,
    cgu_signature_ip,
    cgu_signature_user_agent,
    cgu_signature_hash
  ) VALUES (
    p_tester_id,
    pgp_sym_encrypt(p_iban_clear, p_encryption_key),
    p_iban_last4,
    p_iban_country,
    p_bic,
    p_account_holder_name,
    p_fiscal_residence_country,
    now(),
    p_cgu_version,
    p_cgu_signature_ip,
    p_cgu_signature_user_agent,
    p_cgu_signature_hash
  )
  ON CONFLICT (tester_id) DO UPDATE SET
    iban_encrypted = EXCLUDED.iban_encrypted,
    iban_last4 = EXCLUDED.iban_last4,
    iban_country = EXCLUDED.iban_country,
    bic = EXCLUDED.bic,
    account_holder_name = EXCLUDED.account_holder_name,
    fiscal_residence_country = EXCLUDED.fiscal_residence_country,
    cgu_signed_at = EXCLUDED.cgu_signed_at,
    cgu_version = EXCLUDED.cgu_version,
    cgu_signature_ip = EXCLUDED.cgu_signature_ip,
    cgu_signature_user_agent = EXCLUDED.cgu_signature_user_agent,
    cgu_signature_hash = EXCLUDED.cgu_signature_hash;
END;
$$;

ALTER FUNCTION public.upsert_tester_payment_info(
  UUID, TEXT, TEXT, CHAR, TEXT, TEXT, CHAR, TEXT, INET, TEXT, TEXT, TEXT
) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.upsert_tester_payment_info(
  UUID, TEXT, TEXT, CHAR, TEXT, TEXT, CHAR, TEXT, INET, TEXT, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.upsert_tester_payment_info(
  UUID, TEXT, TEXT, CHAR, TEXT, TEXT, CHAR, TEXT, INET, TEXT, TEXT, TEXT
) TO service_role;

-- =====================================================================
-- RPC : decrypt_tester_iban (pour generation SEPA cote staff)
-- =====================================================================
-- Retourne l'IBAN en clair. A utiliser UNIQUEMENT au moment de la generation
-- du fichier de virement SEPA. Le resultat ne doit jamais etre persiste,
-- jamais logge, jamais retourne au testeur.
CREATE OR REPLACE FUNCTION public.decrypt_tester_iban(
  p_tester_id UUID,
  p_encryption_key TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_iban_clear TEXT;
BEGIN
  SELECT pgp_sym_decrypt(iban_encrypted, p_encryption_key)::TEXT
  INTO v_iban_clear
  FROM public.tester_payment_info
  WHERE tester_id = p_tester_id;

  RETURN v_iban_clear;
END;
$$;

ALTER FUNCTION public.decrypt_tester_iban(UUID, TEXT) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.decrypt_tester_iban(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrypt_tester_iban(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.upsert_tester_payment_info IS
'Insere ou met a jour les infos de paiement d''un testeur en chiffrant l''IBAN. Acces service_role uniquement.';
COMMENT ON FUNCTION public.decrypt_tester_iban IS
'Decrypte l''IBAN d''un testeur (usage genereation SEPA). Le resultat ne doit jamais etre persiste ni logge.';
