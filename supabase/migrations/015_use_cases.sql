-- =====================================================================
-- Migration 015 : Cas d'usage et criteres de succes (Tranche 2)
-- =====================================================================
-- Cree project_use_cases + use_case_success_criteria.
-- Ajoute use_case_id + question_hint sur project_questions.
-- Migre les projets existants vers un cas d'usage "Questions libres".
-- =====================================================================

-- 1. Table project_use_cases
CREATE TABLE IF NOT EXISTS public.project_use_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  task_wording TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  expected_testers_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_use_cases_project_id
  ON public.project_use_cases(project_id);

ALTER TABLE public.project_use_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "use_cases_select_staff" ON public.project_use_cases;
CREATE POLICY "use_cases_select_staff" ON public.project_use_cases
  FOR SELECT USING (false);

DROP POLICY IF EXISTS "use_cases_insert_service_role" ON public.project_use_cases;
CREATE POLICY "use_cases_insert_service_role" ON public.project_use_cases
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "use_cases_update_service_role" ON public.project_use_cases;
CREATE POLICY "use_cases_update_service_role" ON public.project_use_cases
  FOR UPDATE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "use_cases_delete_service_role" ON public.project_use_cases;
CREATE POLICY "use_cases_delete_service_role" ON public.project_use_cases
  FOR DELETE USING (false);

-- 2. Table use_case_success_criteria
CREATE TABLE IF NOT EXISTS public.use_case_success_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id UUID NOT NULL REFERENCES public.project_use_cases(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_criteria_use_case_id
  ON public.use_case_success_criteria(use_case_id);

ALTER TABLE public.use_case_success_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "criteria_select_staff" ON public.use_case_success_criteria;
CREATE POLICY "criteria_select_staff" ON public.use_case_success_criteria
  FOR SELECT USING (false);

DROP POLICY IF EXISTS "criteria_insert_service_role" ON public.use_case_success_criteria;
CREATE POLICY "criteria_insert_service_role" ON public.use_case_success_criteria
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "criteria_update_service_role" ON public.use_case_success_criteria;
CREATE POLICY "criteria_update_service_role" ON public.use_case_success_criteria
  FOR UPDATE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "criteria_delete_service_role" ON public.use_case_success_criteria;
CREATE POLICY "criteria_delete_service_role" ON public.use_case_success_criteria
  FOR DELETE USING (false);

-- 3. Nouveaux champs sur project_questions
ALTER TABLE public.project_questions
  ADD COLUMN IF NOT EXISTS use_case_id UUID REFERENCES public.project_use_cases(id) ON DELETE SET NULL;

ALTER TABLE public.project_questions
  ADD COLUMN IF NOT EXISTS question_hint TEXT;

CREATE INDEX IF NOT EXISTS idx_questions_use_case_id
  ON public.project_questions(use_case_id);

-- 4. Migration des donnees : creer un UC "Questions libres" pour chaque projet
--    ayant des questions sans use_case_id.
--    Idempotent : on ne cree que si le projet n'a pas encore de use_case.
DO $$
DECLARE
  r RECORD;
  uc_id UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT pq.project_id
    FROM public.project_questions pq
    WHERE pq.use_case_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.project_use_cases uc
        WHERE uc.project_id = pq.project_id
      )
  LOOP
    INSERT INTO public.project_use_cases (project_id, title, task_wording, "order")
    VALUES (r.project_id, 'Questions libres', 'Questions du test (migrées automatiquement)', 0)
    RETURNING id INTO uc_id;

    UPDATE public.project_questions
    SET use_case_id = uc_id
    WHERE project_id = r.project_id AND use_case_id IS NULL;
  END LOOP;
END;
$$;

-- 5. Trigger updated_at sur project_use_cases
CREATE OR REPLACE FUNCTION public.update_use_case_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_use_case_updated_at ON public.project_use_cases;
CREATE TRIGGER trigger_use_case_updated_at
  BEFORE UPDATE ON public.project_use_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_use_case_updated_at();
