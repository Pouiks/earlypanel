-- ============================================
-- Project NDAs + traceability on project_testers
-- ============================================

-- 1 NDA template per project
CREATE TABLE IF NOT EXISTS public.project_ndas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Accord de confidentialité (NDA)',
  content_html TEXT NOT NULL DEFAULT '',
  UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_ndas_project ON public.project_ndas(project_id);

ALTER TABLE public.project_ndas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_ndas_select" ON public.project_ndas FOR SELECT USING (false);
CREATE POLICY "project_ndas_insert" ON public.project_ndas FOR INSERT WITH CHECK (false);
CREATE POLICY "project_ndas_update" ON public.project_ndas FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "project_ndas_delete" ON public.project_ndas FOR DELETE USING (false);

CREATE TRIGGER project_ndas_updated_at
  BEFORE UPDATE ON public.project_ndas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Traceability columns on project_testers
ALTER TABLE public.project_testers
  ADD COLUMN IF NOT EXISTS nda_signer_ip TEXT,
  ADD COLUMN IF NOT EXISTS nda_signer_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS nda_document_hash TEXT;

-- Storage bucket for signed documents (run in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
-- ON CONFLICT DO NOTHING;
