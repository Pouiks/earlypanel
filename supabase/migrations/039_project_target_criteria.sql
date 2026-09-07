-- =====================================================================
-- Migration 039 : Cible client complete sur le projet
-- =====================================================================
-- Le ciblage projet ne couvrait que genre / age / CSP / secteur / villes.
-- On ajoute un JSONB pour le reste du vocabulaire testeur (persona, metier,
-- taille d'entreprise, niveau digital, appareils, navigateurs, OS mobile,
-- connexion, outils, centres d'interet, disponibilite, experience UX) et la
-- liste des criteres marques « obligatoires ». Forme : voir
-- src/lib/target-criteria.ts (TargetCriteria). Les colonnes target_* existantes
-- restent la source pour genre / age / CSP / secteur / villes.
-- `testers` n'est pas touchee.
-- =====================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS target_criteria  JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS target_headcount INTEGER;

COMMENT ON COLUMN public.projects.target_criteria IS
  'Cible client etendue (TargetCriteria, src/lib/target-criteria.ts) : criteres souhaites + liste `required` des criteres obligatoires.';
COMMENT ON COLUMN public.projects.target_headcount IS
  'Nombre de testeurs voulus par le client pour ce projet (indicatif).';

-- Verification :
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'projects' AND column_name IN ('target_criteria', 'target_headcount');
