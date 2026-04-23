-- =====================================================================
-- Migration 016 : Genre testeur + Completions (Tranche 3)
-- =====================================================================

-- 1. Champ gender sur testers
ALTER TABLE public.testers
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IN ('female', 'male', 'non_binary', 'prefer_not_to_say'));

-- 2. Table use_case_completions
CREATE TABLE IF NOT EXISTS public.use_case_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_tester_id UUID NOT NULL REFERENCES public.project_testers(id) ON DELETE CASCADE,
  use_case_id UUID NOT NULL REFERENCES public.project_use_cases(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.use_case_success_criteria(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL DEFAULT false,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_completions_unique
  ON public.use_case_completions(project_tester_id, criterion_id);

CREATE INDEX IF NOT EXISTS idx_completions_use_case
  ON public.use_case_completions(use_case_id);

ALTER TABLE public.use_case_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "completions_select_staff" ON public.use_case_completions;
CREATE POLICY "completions_select_staff" ON public.use_case_completions
  FOR SELECT USING (false);

DROP POLICY IF EXISTS "completions_insert_service_role" ON public.use_case_completions;
CREATE POLICY "completions_insert_service_role" ON public.use_case_completions
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "completions_update_service_role" ON public.use_case_completions;
CREATE POLICY "completions_update_service_role" ON public.use_case_completions
  FOR UPDATE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "completions_delete_service_role" ON public.use_case_completions;
CREATE POLICY "completions_delete_service_role" ON public.use_case_completions
  FOR DELETE USING (false);
