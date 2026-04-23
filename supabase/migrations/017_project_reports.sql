-- =====================================================================
-- Migration 017 : Table project_reports (Tranche 4a)
-- =====================================================================
-- Un rapport par projet. Contenu redactionnel en JSONB.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  delivery_date DATE,

  -- Contenu redactionnel (JSONB)
  summary JSONB DEFAULT '{}',
  bugs JSONB DEFAULT '[]',
  frictions JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  impact_effort_matrix JSONB DEFAULT '{}',
  include_annexes BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_project_id
  ON public.project_reports(project_id);

ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select_staff" ON public.project_reports;
CREATE POLICY "reports_select_staff" ON public.project_reports
  FOR SELECT USING (false);

DROP POLICY IF EXISTS "reports_insert_service_role" ON public.project_reports;
CREATE POLICY "reports_insert_service_role" ON public.project_reports
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "reports_update_service_role" ON public.project_reports;
CREATE POLICY "reports_update_service_role" ON public.project_reports
  FOR UPDATE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "reports_delete_service_role" ON public.project_reports;
CREATE POLICY "reports_delete_service_role" ON public.project_reports
  FOR DELETE USING (false);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_report_updated_at ON public.project_reports;
CREATE TRIGGER trigger_report_updated_at
  BEFORE UPDATE ON public.project_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_report_updated_at();
