-- =====================================================================
-- Migration 033 : Fix search_path pour resoudre pgp_sym_encrypt
-- =====================================================================
-- Bug : sur Supabase prod, l'extension `pgcrypto` est installee dans le
-- schema `extensions` (convention managed Postgres). Nos RPC SECURITY
-- DEFINER avaient `SET search_path = public, pg_temp` qui exclut
-- `extensions` -> appels `pgp_sym_encrypt(...)` non resolus -> erreur :
--
--   ERROR: function pgp_sym_encrypt(text, text) does not exist
--
-- Symptome cote app : 500 a chaque tentative d'enregistrement IBAN
-- (POST /api/testers/me/payment-info), ainsi qu'a chaque export CSV
-- staff (POST /api/staff/payouts/export).
--
-- Fix : ajouter `extensions` au search_path des 3 RPC concernees. Garde
-- la securite (pas de injection search_path car schemas explicites) tout
-- en permettant aux fonctions de retrouver pgp_sym_encrypt et pgp_sym_decrypt.
-- =====================================================================

-- 1. S'assurer que pgcrypto est bien dans le schema `extensions`. Si elle
--    etait par erreur dans `public`, on ne touche pas (CREATE EXTENSION
--    IF NOT EXISTS ne deplace rien). Le check suivant ne retournera rien
--    de visible mais s'assure de l'idempotence.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Re-ALTER les 3 RPC sensibles pour inclure `extensions` dans leur
--    search_path. C'est le seul changement reel : aucun corps de fonction
--    n'est modifie, on touche juste les attributs de la fonction.

ALTER FUNCTION public.upsert_tester_payment_info(
  UUID, TEXT, TEXT, CHAR, TEXT, TEXT, CHAR, TEXT, INET, TEXT, TEXT, TEXT
) SET search_path = public, extensions, pg_temp;

ALTER FUNCTION public.decrypt_tester_iban(UUID, TEXT)
  SET search_path = public, extensions, pg_temp;

ALTER FUNCTION public.decrypt_tester_ibans_batch(UUID[], TEXT)
  SET search_path = public, extensions, pg_temp;

-- 3. Verification : afficher les search_path actuels apres ALTER pour
--    confirmer que la migration a bien tourne.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT proname, proconfig
    FROM pg_proc
    WHERE proname IN (
      'upsert_tester_payment_info',
      'decrypt_tester_iban',
      'decrypt_tester_ibans_batch'
    )
  LOOP
    RAISE NOTICE 'Function % search_path config: %', r.proname, r.proconfig;
  END LOOP;
END;
$$;
