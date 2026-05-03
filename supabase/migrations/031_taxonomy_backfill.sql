-- =====================================================================
-- Migration 031 : Remappage des donnees existantes vers la nouvelle taxonomie
-- =====================================================================
-- Avant cette migration, les listes de secteurs et CSP n'etaient pas
-- centralisees (3 listes hardcodees differentes : onboarding, profil, projet).
-- La migration 030 a centralise dans src/lib/taxonomy.ts mais n'a PAS
-- backfille les donnees existantes — d'ou des testeurs/projets avec des
-- labels qui ne matchent plus les filtres.
--
-- Cette migration applique le remappage 1-pour-1. Idempotente : un re-run
-- ne re-applique pas les UPDATE deja effectues car les valeurs source sont
-- desormais introuvables.
-- =====================================================================

-- 1. testers.sector : ancien dropdown vers nouveau --------------------

UPDATE public.testers SET sector = 'Tech / IT / Software'    WHERE sector = 'Tech / SaaS';
UPDATE public.testers SET sector = 'Santé / Pharma'          WHERE sector = 'Santé';
UPDATE public.testers SET sector = 'Éducation / Formation'   WHERE sector = 'Éducation';
UPDATE public.testers SET sector = 'Industrie / Manufacturing' WHERE sector = 'Industrie';
-- Les autres secteurs anciens ('E-commerce', 'Finance / Banque', 'Assurance',
-- 'RH / Recrutement', 'Juridique', 'Immobilier', 'Transport / Logistique',
-- 'Autre') sont identiques dans la nouvelle liste : aucun UPDATE necessaire.

-- 2. projects.target_sector : ancien dropdown projet vers nouveau ----

UPDATE public.projects SET target_sector = 'Tech / IT / Software'             WHERE target_sector = 'Tech / IT';
UPDATE public.projects SET target_sector = 'Santé / Pharma'                   WHERE target_sector = 'Santé';
UPDATE public.projects SET target_sector = 'Éducation / Formation'            WHERE target_sector = 'Éducation';
UPDATE public.projects SET target_sector = 'Industrie / Manufacturing'        WHERE target_sector = 'Industrie';
UPDATE public.projects SET target_sector = 'Agroalimentaire'                  WHERE target_sector = 'Alimentation';
UPDATE public.projects SET target_sector = 'Tourisme / Hôtellerie / Restauration' WHERE target_sector = 'Tourisme / Hôtellerie';

-- 3. projects.target_csp : ancien array (pluriel) vers nouveau (singulier) -

-- Le CSP est un TEXT[]. On remplace chaque ancienne valeur par sa nouvelle
-- en une passe (array_replace). Les valeurs sans equivalent direct
-- ('Agriculteurs', 'Artisans / Commerçants') sont mappees vers
-- 'Indépendant / Auto-entrepreneur' (la categorie la plus proche dans
-- la nouvelle taxonomie INSEE simplifiee).

UPDATE public.projects SET target_csp = array_replace(target_csp, 'Étudiants',                       'Étudiant');
UPDATE public.projects SET target_csp = array_replace(target_csp, 'Cadres / Prof. intellectuelles',  'Cadre / Profession intellectuelle supérieure');
UPDATE public.projects SET target_csp = array_replace(target_csp, 'Professions intermédiaires',      'Profession intermédiaire');
UPDATE public.projects SET target_csp = array_replace(target_csp, 'Employés',                        'Employé');
UPDATE public.projects SET target_csp = array_replace(target_csp, 'Ouvriers',                        'Ouvrier');
UPDATE public.projects SET target_csp = array_replace(target_csp, 'Retraités',                       'Retraité');
UPDATE public.projects SET target_csp = array_replace(target_csp, 'Agriculteurs',                    'Indépendant / Auto-entrepreneur');
UPDATE public.projects SET target_csp = array_replace(target_csp, 'Artisans / Commerçants',          'Indépendant / Auto-entrepreneur');

-- Apres mappage, on peut avoir des doublons si l'ancien projet contenait
-- a la fois 'Agriculteurs' ET 'Artisans / Commerçants' (les deux deviennent
-- 'Indépendant / Auto-entrepreneur'). On dedoublonne :

UPDATE public.projects
SET target_csp = ARRAY(SELECT DISTINCT unnest(target_csp))
WHERE target_csp IS NOT NULL AND array_length(target_csp, 1) > 0;

-- 4. Rapport de la migration -------------------------------------------
-- (Affichage cote logs uniquement : Supabase MCP/CLI affiche les RAISE NOTICE
-- au runtime. Aide a verifier que le remappage a touche les bons volumes.)

DO $$
DECLARE
  testers_count INTEGER;
  projects_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO testers_count
  FROM public.testers
  WHERE sector IS NOT NULL;
  RAISE NOTICE 'Migration 031 : % testeurs avec un sector defini', testers_count;

  SELECT COUNT(*) INTO projects_count
  FROM public.projects
  WHERE target_sector IS NOT NULL OR (target_csp IS NOT NULL AND array_length(target_csp, 1) > 0);
  RAISE NOTICE 'Migration 031 : % projets avec un ciblage secteur/CSP', projects_count;
END;
$$;
