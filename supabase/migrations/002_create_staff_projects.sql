-- ============================================
-- Staff members table
-- ============================================
CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON public.staff_members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff_members(email);

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_own" ON public.staff_members
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "staff_insert_service_role" ON public.staff_members
  FOR INSERT WITH CHECK (false);

CREATE POLICY "staff_update_own" ON public.staff_members
  FOR UPDATE USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE TRIGGER staff_members_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- Projects table
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived')),

  title TEXT NOT NULL,
  description TEXT,

  company_name TEXT,
  sector TEXT,
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  urls TEXT[] DEFAULT '{}',

  target_gender TEXT[] DEFAULT '{}',
  target_age_min INTEGER,
  target_age_max INTEGER,
  target_csp TEXT[] DEFAULT '{}',
  target_sector TEXT,
  target_sector_restricted BOOLEAN DEFAULT FALSE,
  target_locations TEXT[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_staff" ON public.projects
  FOR SELECT USING (false);

CREATE POLICY "projects_insert_service_role" ON public.projects
  FOR INSERT WITH CHECK (false);

CREATE POLICY "projects_update_service_role" ON public.projects
  FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "projects_delete_service_role" ON public.projects
  FOR DELETE USING (false);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- Project questions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  question_text TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_project_id ON public.project_questions(project_id);

ALTER TABLE public.project_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions_select_staff" ON public.project_questions
  FOR SELECT USING (false);

CREATE POLICY "questions_insert_service_role" ON public.project_questions
  FOR INSERT WITH CHECK (false);

CREATE POLICY "questions_update_service_role" ON public.project_questions
  FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "questions_delete_service_role" ON public.project_questions
  FOR DELETE USING (false);
