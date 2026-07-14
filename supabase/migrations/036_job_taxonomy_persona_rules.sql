-- =====================================================================
-- 036 — Taxonomie métier (job_family / seniority) + règles personas
-- =====================================================================
--
-- CONTEXTE
-- Le matching des personas s'était désynchronisé des données :
--  - les règles en base utilisaient `seniorities` / `job_families`…
--  - …mais le code (persona-matcher.ts) ne lisait que company_size / digital ;
--  - et les colonnes testers.seniority / testers.job_family étaient 100% NULL.
-- Résultat : la classification s'était effondrée sur « grande entreprise →
-- tarif max », ignorant totalement le métier (un webdesigner à 85€, un
-- développeur senior à 25€).
--
-- CE QUE FAIT CETTE MIGRATION
--  1. Fige la taxonomie via une contrainte CHECK sur les 2 colonnes (elles
--     existaient déjà, ajoutées hors-migration ; on les sécurise ici).
--  2. Réécrit les matching_rules des 5 personas selon le barème validé.
--
-- ORDRE DE DÉPLOIEMENT
--  1) Déployer le code (job-classifier.ts + persona-matcher.ts lisant la taxo).
--  2) Appliquer CETTE migration.
--  3) Cliquer « Recalculer tous les testeurs » (staff → Personas) : ça
--     backfille job_family/seniority ET recalcule les personas d'un coup.
--
-- Idempotente : rejouable sans effet de bord.
-- =====================================================================

-- 1. Colonnes (déjà présentes en prod ; IF NOT EXISTS pour les envs vierges) --
ALTER TABLE public.testers ADD COLUMN IF NOT EXISTS job_family TEXT;
ALTER TABLE public.testers ADD COLUMN IF NOT EXISTS seniority TEXT;

COMMENT ON COLUMN public.testers.job_family IS
  'Famille de métier dérivée du job_title (cf. lib/job-classifier.ts). Alimente le matching persona. NULL tant que non (re)classé.';
COMMENT ON COLUMN public.testers.seniority IS
  'Niveau de séniorité dérivé du job_title (cf. lib/job-classifier.ts). Alimente le matching persona.';

-- 2. Contraintes CHECK (autorise NULL + valeurs de la taxonomie) -------------
-- On drop d'abord une éventuelle contrainte homonyme (rejouabilité).
ALTER TABLE public.testers DROP CONSTRAINT IF EXISTS testers_job_family_check;
ALTER TABLE public.testers ADD CONSTRAINT testers_job_family_check CHECK (
  job_family IS NULL OR job_family IN (
    'health-regulated','legal-regulated','executive','tech-product','finance',
    'legal','consulting','hr','marketing','sales','ops','real-estate','creative',
    'education','health-support','public-social','industry','trades',
    'hospitality-retail','transport','agriculture','admin','student','inactive','other'
  )
);

ALTER TABLE public.testers DROP CONSTRAINT IF EXISTS testers_seniority_check;
ALTER TABLE public.testers ADD CONSTRAINT testers_seniority_check CHECK (
  seniority IS NULL OR seniority IN (
    'executive','management','confirmed','junior','student','none'
  )
);

CREATE INDEX IF NOT EXISTS idx_testers_job_family ON public.testers(job_family);
CREATE INDEX IF NOT EXISTS idx_testers_seniority ON public.testers(seniority);

-- 3. Règles des 5 personas (barème validé) -----------------------------------
-- Niche Premium (85€) : professions réglementées rares (toute taille) OU
--                       dirigeant C-level d'une grande entreprise.
UPDATE public.tester_personas SET
  priority = 50,
  is_fallback = false,
  is_active = true,
  matching_rules = '{
    "any_of": [
      { "job_families": ["health-regulated", "legal-regulated"] },
      { "seniorities": ["executive"], "job_families": ["executive"], "company_sizes": ["201-1000", "1000+"] }
    ]
  }'::jsonb
WHERE slug = 'niche-premium';

-- Profil rare (60€) : dirigeants & directeurs de fonction (hors grandes
-- entreprises, qui passent en Niche). On cible la famille `executive` (C-level,
-- fondateurs, directeurs de fonction) — un simple manager d'un métier qualifié
-- relève d'Expert métier, pas de Profil rare.
UPDATE public.tester_personas SET
  priority = 40,
  is_fallback = false,
  is_active = true,
  matching_rules = '{
    "seniorities": ["executive", "management"],
    "job_families": ["executive"]
  }'::jsonb
WHERE slug = 'profil-rare';

-- Expert métier (40€) : professionnels confirmés d'un métier qualifié.
UPDATE public.tester_personas SET
  priority = 30,
  is_fallback = false,
  is_active = true,
  matching_rules = '{
    "seniorities": ["confirmed", "management"],
    "job_families": ["tech-product", "finance", "legal", "consulting", "hr", "marketing", "sales", "ops"]
  }'::jsonb
WHERE slug = 'expert-metier';

-- Digital actif (25€) : bon niveau digital, non classé au-dessus.
UPDATE public.tester_personas SET
  priority = 20,
  is_fallback = false,
  is_active = true,
  matching_rules = '{ "digital_levels": ["avance", "expert"] }'::jsonb
WHERE slug = 'digital-actif';

-- Grand public (15€) : fallback.
UPDATE public.tester_personas SET
  priority = 0,
  is_fallback = true,
  is_active = true,
  matching_rules = '{}'::jsonb
WHERE slug = 'grand-public';

-- 4. Vérification (optionnelle, à lire dans le SQL editor) --------------------
DO $$
DECLARE
  n_personas INT;
BEGIN
  SELECT count(*) INTO n_personas FROM public.tester_personas
    WHERE slug IN ('niche-premium','profil-rare','expert-metier','digital-actif','grand-public');
  RAISE NOTICE 'Personas mis à jour : %/5. Pense à cliquer « Recalculer tous les testeurs ».', n_personas;
END $$;
