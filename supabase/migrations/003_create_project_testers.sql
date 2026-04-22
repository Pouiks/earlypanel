-- ============================================
-- Project-Testers relationship table
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_testers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tester_id UUID NOT NULL REFERENCES public.testers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'selected'
    CHECK (status IN ('selected', 'nda_sent', 'nda_signed', 'invited', 'in_progress', 'completed')),
  nda_document_url TEXT,
  nda_sent_at TIMESTAMPTZ,
  nda_signed_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(project_id, tester_id)
);

CREATE INDEX IF NOT EXISTS idx_project_testers_project ON public.project_testers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_testers_tester ON public.project_testers(tester_id);
CREATE INDEX IF NOT EXISTS idx_project_testers_status ON public.project_testers(status);

ALTER TABLE public.project_testers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_testers_select" ON public.project_testers
  FOR SELECT USING (false);

CREATE POLICY "project_testers_insert" ON public.project_testers
  FOR INSERT WITH CHECK (false);

CREATE POLICY "project_testers_update" ON public.project_testers
  FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "project_testers_delete" ON public.project_testers
  FOR DELETE USING (false);

CREATE TRIGGER project_testers_updated_at
  BEFORE UPDATE ON public.project_testers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
