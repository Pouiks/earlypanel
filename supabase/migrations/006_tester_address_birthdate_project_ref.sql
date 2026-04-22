-- ============================================
-- Add address + birth_date to testers
-- Add reference number to projects
-- ============================================

-- Tester: address & birth date for NDA variables
ALTER TABLE public.testers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Project: auto-increment reference number
CREATE SEQUENCE IF NOT EXISTS project_ref_seq START 1;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS ref_number TEXT;

-- Set ref for existing projects that don't have one
UPDATE public.projects
SET ref_number = 'PROJ-' || LPAD(nextval('project_ref_seq')::TEXT, 5, '0')
WHERE ref_number IS NULL;

-- Auto-generate ref on insert
CREATE OR REPLACE FUNCTION public.set_project_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ref_number IS NULL OR NEW.ref_number = '' THEN
    NEW.ref_number := 'PROJ-' || LPAD(nextval('project_ref_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_project_ref
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_project_ref();
