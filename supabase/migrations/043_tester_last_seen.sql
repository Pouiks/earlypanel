-- =====================================================================
-- Migration 043 : Derniere connexion et derniere activite des testeurs
-- =====================================================================
-- Deux horodatages, distincts :
--   - last_login_at : ouverture d'une session (clic sur un magic link,
--     /app/auth/callback). Une session Supabase se renouvelle ensuite
--     toute seule, donc un testeur assidu peut ne "se connecter" que
--     rarement : ce champ sous-estime l'activite.
--   - last_seen_at  : derniere requete authentifiee (API testeur, pages
--     /app). Rafraichi au plus une fois par heure (getAuthedTester), en
--     tache de fond, jamais sur le chemin de la reponse.
--
-- Usages :
--   - Staff : colonne « Activite » + filtre « inactifs depuis N jours »
--     sur la liste des testeurs (qui garder, qui relancer, qui sortir).
--   - RGPD : la politique de confidentialite promet une conservation de
--     « 3 ans apres la derniere connexion ». Sans horodatage, cette
--     promesse n'etait ni mesurable ni applicable. Reference =
--     COALESCE(last_seen_at, last_login_at, created_at).
--
-- Backfill : Supabase Auth tient deja auth.users.last_sign_in_at (date
-- du dernier magic link valide). On l'importe une fois pour ne pas
-- partir de zero. Les testeurs sans session connue restent NULL
-- (= « jamais connecte » cote staff).
-- =====================================================================

ALTER TABLE public.testers
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.testers.last_login_at IS
  'Derniere ouverture de session (magic link valide). NULL = jamais connecte.';
COMMENT ON COLUMN public.testers.last_seen_at IS
  'Derniere requete authentifiee du testeur, granularite 1 h. Base du filtre inactivite et de la retention RGPD (3 ans).';

-- Backfill unique depuis Supabase Auth (execute en SQL editor = role postgres,
-- qui lit auth.users). Ne remplit que les lignes encore vides.
UPDATE public.testers t
SET
  last_login_at = COALESCE(t.last_login_at, u.last_sign_in_at),
  last_seen_at  = COALESCE(t.last_seen_at,  u.last_sign_in_at)
FROM auth.users u
WHERE u.id = t.auth_user_id
  AND u.last_sign_in_at IS NOT NULL
  AND (t.last_login_at IS NULL OR t.last_seen_at IS NULL);

-- Le filtre staff trie et borne sur last_seen_at.
CREATE INDEX IF NOT EXISTS idx_testers_last_seen_at
  ON public.testers (last_seen_at);

-- =====================================================================
-- Verification post-application :
--   SELECT count(*) FILTER (WHERE last_seen_at IS NULL) AS jamais_connectes,
--          count(*) AS total
--   FROM public.testers;
-- =====================================================================
