-- =====================================================================
-- Migration 034 : Onboarding tour testeur (guided product tour)
-- =====================================================================
-- Ajoute deux timestamps sur `testers` pour distinguer :
--   - tour termine (l'utilisateur a cliqué sur "Commencer" a la derniere etape)
--   - tour skippe (l'utilisateur a cliqué "Passer" pendant le tour)
--
-- Le bouton "?" dans la sidebar peut relancer le tour a tout moment, sans
-- modifier ces colonnes : c'est juste un re-trigger manuel.
--
-- Le trigger automatique ne se declenche QUE si :
--   onboarding_tour_completed_at IS NULL AND onboarding_tour_skipped_at IS NULL
--
-- Pas de side effect : si on rejoue cette migration, IF NOT EXISTS empeche
-- toute duplication.
-- =====================================================================

ALTER TABLE public.testers
  ADD COLUMN IF NOT EXISTS onboarding_tour_completed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS onboarding_tour_skipped_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.testers.onboarding_tour_completed_at
  IS 'Timestamp ou le testeur a fini le tour guide (clic "Commencer" derniere etape). Null = jamais fini.';

COMMENT ON COLUMN public.testers.onboarding_tour_skipped_at
  IS 'Timestamp ou le testeur a clique "Passer" pendant le tour. Null = jamais skippe. Peut etre non-null en meme temps que completed_at si l''utilisateur a skippe puis a relance via le bouton "?" et termine.';
