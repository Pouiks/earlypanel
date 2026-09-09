-- =====================================================================
-- Migration 041 : Documents de projet (brief client), staff uniquement
-- =====================================================================
-- Le brief recu du client (PDF, texte) est depose tel quel sur le projet
-- pour etre retrouve sans ressaisie. Fichiers dans le bucket PRIVE
-- `documents` (le meme que les NDA signes), chemin `briefs/<project>/<uuid>.<ext>`,
-- servis par URL signee 1 h a la volee. Jamais exposes cote testeur.
-- Une table plutot qu'un JSONB sur projects : plusieurs fichiers, nom
-- d'origine, taille, auteur, et suppression propre (ligne + objet storage).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.project_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL DEFAULT 'brief' CHECK (kind IN ('brief')),
  file_name    TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type    TEXT NOT NULL,
  size_bytes   INTEGER NOT NULL CHECK (size_bytes >= 0),
  uploaded_by  UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_documents_project ON public.project_documents(project_id);

COMMENT ON TABLE public.project_documents IS
  'Fichiers deposes par le staff sur un projet (brief client). Bucket prive documents, URL signee a la volee. Staff uniquement.';

-- RLS fermee : acces exclusivement via service_role (routes staff).
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_documents_deny_all ON public.project_documents;
CREATE POLICY project_documents_deny_all ON public.project_documents
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Verification :
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'project_documents';
