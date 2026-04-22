-- Personas testeurs : categorisation marketing/fourchette remuneration indicative.
-- Independant du `tier` (qualite d'execution). Evalue a l'onboarding et au PATCH profil.

CREATE TABLE IF NOT EXISTS public.tester_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  min_reward_cents INTEGER NOT NULL DEFAULT 0,
  max_reward_cents INTEGER NOT NULL DEFAULT 0,
  matching_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_fallback BOOLEAN NOT NULL DEFAULT false
);

-- Si la table existait deja avec un schema partiel, on aligne les colonnes manquantes.
ALTER TABLE public.tester_personas ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.tester_personas ADD COLUMN IF NOT EXISTS min_reward_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.tester_personas ADD COLUMN IF NOT EXISTS max_reward_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.tester_personas ADD COLUMN IF NOT EXISTS matching_rules JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.tester_personas ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.tester_personas ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.tester_personas ADD COLUMN IF NOT EXISTS is_fallback BOOLEAN NOT NULL DEFAULT false;

COMMENT ON TABLE public.tester_personas IS 'Categorie marketing du testeur. La fourchette est indicative, affichee au testeur apres onboarding.';
COMMENT ON COLUMN public.tester_personas.priority IS 'Ordre evaluation decroissant : priorite haute evaluee en premier.';
COMMENT ON COLUMN public.tester_personas.is_fallback IS 'Persona par defaut si aucune regle ne matche. Un seul fallback actif attendu.';
COMMENT ON COLUMN public.tester_personas.matching_rules IS 'Option A : { job_title_keywords, sectors, digital_levels, company_sizes } — intersection de conditions non-vides.';

CREATE INDEX IF NOT EXISTS idx_tester_personas_active ON public.tester_personas(is_active, priority DESC);

ALTER TABLE public.tester_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tester_personas_no_direct" ON public.tester_personas;
CREATE POLICY "tester_personas_no_direct" ON public.tester_personas FOR ALL USING (false);

DROP TRIGGER IF EXISTS tester_personas_updated_at ON public.tester_personas;
CREATE TRIGGER tester_personas_updated_at
  BEFORE UPDATE ON public.tester_personas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Liaison cote testeurs
ALTER TABLE public.testers
  ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES public.tester_personas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS persona_locked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.testers.persona_locked IS 'Si TRUE, le staff a force manuellement le persona ; aucun recalcul auto.';

CREATE INDEX IF NOT EXISTS idx_testers_persona ON public.testers(persona_id);

-- Seed des 5 personas par defaut
INSERT INTO public.tester_personas (slug, name, description, min_reward_cents, max_reward_cents, priority, is_fallback, matching_rules)
VALUES
  ('niche-premium', 'Niche Premium',
   'Profils tres recherches, tres hautes competences.',
   8500, 10000, 50, false,
   '{"job_title_keywords":["chirurgien","notaire","magistrat","pilote","CEO","CFO","CTO","directeur general","directeur-general","DG"],"company_sizes":["201-1000","1000+"]}'::jsonb),
  ('profil-rare', 'Profil rare',
   'Decideurs et experts rares de leur domaine.',
   6000, 8500, 40, false,
   '{"job_title_keywords":["DAF","DSI","DRH","avocat","medecin","juriste","directeur","head of","VP","responsable juridique","responsable financier"]}'::jsonb),
  ('expert-metier', 'Expert metier',
   'Professionnel experimente dans un metier specialise.',
   4000, 6000, 30, false,
   '{"job_title_keywords":["RH","comptable","developpeur","developer","marketing","commercial","product","produit","data","ingenieur","engineer","consultant","lead","senior"]}'::jsonb),
  ('digital-actif', 'Digital actif',
   'Salarie ou freelance du tertiaire, bon niveau digital.',
   2500, 4000, 20, false,
   '{"digital_levels":["avance","expert"]}'::jsonb),
  ('grand-public', 'Grand public',
   'Tout profil. Rémunération de base.',
   1500, 2500, 0, true,
   '{}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
