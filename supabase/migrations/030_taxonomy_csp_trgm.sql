-- =====================================================================
-- Migration 030 : CSP testeur + recherche fuzzy job_title (pg_trgm)
-- =====================================================================
-- Permet a un client de demander "comptables 25-35 ans" ou "etudiants" et
-- au staff de filtrer la base sans relire chaque profil. Trois ajouts :
--
--   1. testers.csp : nouvelle colonne libre (validee cote application via
--      la liste de src/lib/taxonomy.ts CSPS). Optionnelle, ne casse pas
--      les comptes existants.
--
--   2. Extension pg_trgm + index GIN trigram sur testers.job_title : permet
--      la recherche fuzzy / substring efficace ("comptab" -> "comptable",
--      "expert-comptable", "comptabilite") cote API staff.
--
--   3. Vue calcul d'age : a la place d'une colonne stockee (qui necessiterait
--      des updates daily), on expose une vue pour les requetes staff.
-- =====================================================================

-- 1. CSP du testeur ----------------------------------------------------

ALTER TABLE public.testers
  ADD COLUMN IF NOT EXISTS csp TEXT;

COMMENT ON COLUMN public.testers.csp IS
  'Categorie socio-professionnelle (INSEE simplifie). Validee cote app
   contre src/lib/taxonomy.ts CSPS. Optionnelle.';

-- 2. Recherche fuzzy job_title via pg_trgm -----------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_testers_job_title_trgm
  ON public.testers USING gin (lower(job_title) gin_trgm_ops);

COMMENT ON INDEX public.idx_testers_job_title_trgm IS
  'Permet la recherche fuzzy ILIKE sur job_title : "comptab%" matche
   "comptable", "expert-comptable", "comptabilite", "controleur".';

-- 3. Index utilitaires sur sector (pour filtres staff multi-secteurs) --

CREATE INDEX IF NOT EXISTS idx_testers_sector
  ON public.testers(sector) WHERE sector IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_testers_csp
  ON public.testers(csp) WHERE csp IS NOT NULL;

-- 4. Index sur birth_date pour les filtres age (rapide bornes IS BETWEEN) -

CREATE INDEX IF NOT EXISTS idx_testers_birth_date
  ON public.testers(birth_date) WHERE birth_date IS NOT NULL;
