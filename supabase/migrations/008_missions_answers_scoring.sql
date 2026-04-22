-- =====================================================================
-- Migration 008 : Missions, reponses, scoring et tier recalcul
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Score initial 100 + mise a jour des testeurs existants
-- ---------------------------------------------------------------------
ALTER TABLE public.testers
  ALTER COLUMN quality_score SET DEFAULT 100;

-- Mettre a jour les testeurs a 50 (ancienne valeur par defaut) vers 100
UPDATE public.testers SET quality_score = 100 WHERE quality_score = 50;

-- Ajouter le statut 'suspended' si pas deja present
-- (il est deja present dans 001_create_testers.sql, rien a faire)

-- ---------------------------------------------------------------------
-- 2. Dates projet : DATE -> TIMESTAMPTZ pour heure precise
-- ---------------------------------------------------------------------
ALTER TABLE public.projects
  ALTER COLUMN start_date TYPE TIMESTAMPTZ USING start_date::timestamptz,
  ALTER COLUMN end_date TYPE TIMESTAMPTZ USING end_date::timestamptz;

-- ---------------------------------------------------------------------
-- 3. Colonnes supplementaires sur project_testers
-- ---------------------------------------------------------------------
ALTER TABLE public.project_testers
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS staff_rating INTEGER CHECK (staff_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS staff_note TEXT,
  ADD COLUMN IF NOT EXISTS malus_applied BOOLEAN DEFAULT FALSE;

-- ---------------------------------------------------------------------
-- 4. Table project_tester_answers : reponses des testeurs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_tester_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tester_id UUID NOT NULL REFERENCES public.testers(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.project_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  image_urls TEXT[] DEFAULT '{}',
  UNIQUE(project_id, tester_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_project_tester
  ON public.project_tester_answers(project_id, tester_id);

CREATE INDEX IF NOT EXISTS idx_answers_question
  ON public.project_tester_answers(question_id);

ALTER TABLE public.project_tester_answers ENABLE ROW LEVEL SECURITY;

-- Lecture/ecriture via service role uniquement (RLS stricte)
CREATE POLICY "answers_service_role" ON public.project_tester_answers
  FOR ALL USING (false);

-- Trigger updated_at
CREATE TRIGGER answers_updated_at
  BEFORE UPDATE ON public.project_tester_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------
-- 5. Fonction de recalcul automatique du tier selon le score
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_tester_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Borner le score entre 0 et 100
  IF NEW.quality_score < 0 THEN NEW.quality_score := 0; END IF;
  IF NEW.quality_score > 100 THEN NEW.quality_score := 100; END IF;

  -- Recalcul automatique du tier
  IF NEW.quality_score >= 80 THEN
    NEW.tier := 'premium';
  ELSIF NEW.quality_score >= 65 THEN
    NEW.tier := 'expert';
  ELSE
    NEW.tier := 'standard';
  END IF;

  -- Suspension automatique si score < 40
  -- (sauf si deja suspendu/rejete manuellement)
  IF NEW.quality_score < 40 AND OLD.status NOT IN ('rejected') THEN
    NEW.status := 'suspended';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_tier ON public.testers;
CREATE TRIGGER trg_recalc_tier
  BEFORE UPDATE OF quality_score ON public.testers
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_tester_tier();

-- ---------------------------------------------------------------------
-- 6. Table de log des changements de score (audit + transparence)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tester_score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tester_id UUID NOT NULL REFERENCES public.testers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  new_score INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_score_events_tester
  ON public.tester_score_events(tester_id, created_at DESC);

ALTER TABLE public.tester_score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_events_select_own" ON public.tester_score_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.testers t
      WHERE t.id = tester_id AND t.auth_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 7. Fonction applicative pour appliquer un delta de score
--    (utilisable depuis les API Next.js via service role)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_score_change(
  p_tester_id UUID,
  p_delta INTEGER,
  p_reason TEXT,
  p_project_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_new_score INTEGER;
BEGIN
  UPDATE public.testers
  SET quality_score = quality_score + p_delta
  WHERE id = p_tester_id
  RETURNING quality_score INTO v_new_score;

  INSERT INTO public.tester_score_events (tester_id, project_id, delta, reason, new_score)
  VALUES (p_tester_id, p_project_id, p_delta, p_reason, v_new_score);

  RETURN v_new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 8. Storage bucket pour les images de reponses (prive)
-- ---------------------------------------------------------------------
-- Note : la creation du bucket se fait via l'API Supabase
-- (programmatiquement a la premiere utilisation ou via dashboard).
-- Les policies RLS du bucket doivent etre configurees pour :
-- - INSERT : tester proprietaire uniquement
-- - SELECT : tester proprietaire + staff
-- - DELETE : tester proprietaire uniquement (avant submission)
