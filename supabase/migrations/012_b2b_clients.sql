-- Clients B2B : entreprises/donneurs d'ordre. Un client peut avoir plusieurs projets.
-- Les champs company_name/contact_* restent sur `projects` pour garder un snapshot
-- historique si un projet est detache de son client.

CREATE TABLE IF NOT EXISTS public.b2b_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,

  company_name TEXT NOT NULL,
  sector TEXT,
  website TEXT,
  company_size TEXT,
  vat_number TEXT,
  billing_address TEXT,

  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_role TEXT,

  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived'))
);

COMMENT ON TABLE public.b2b_clients IS 'Clients B2B : entreprises rattachees a un ou plusieurs projets.';

CREATE INDEX IF NOT EXISTS idx_b2b_clients_status ON public.b2b_clients(status);
CREATE INDEX IF NOT EXISTS idx_b2b_clients_company ON public.b2b_clients(company_name);

-- Si la table existait partiellement, on aligne les colonnes manquantes.
ALTER TABLE public.b2b_clients ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE public.b2b_clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.b2b_clients ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE public.b2b_clients ADD COLUMN IF NOT EXISTS vat_number TEXT;
ALTER TABLE public.b2b_clients ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE public.b2b_clients ADD COLUMN IF NOT EXISTS contact_first_name TEXT;
ALTER TABLE public.b2b_clients ADD COLUMN IF NOT EXISTS contact_last_name TEXT;
ALTER TABLE public.b2b_clients ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.b2b_clients ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.b2b_clients ADD COLUMN IF NOT EXISTS contact_role TEXT;
ALTER TABLE public.b2b_clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.b2b_clients ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.b2b_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "b2b_clients_no_direct" ON public.b2b_clients;
CREATE POLICY "b2b_clients_no_direct" ON public.b2b_clients FOR ALL USING (false);

DROP TRIGGER IF EXISTS b2b_clients_updated_at ON public.b2b_clients;
CREATE TRIGGER b2b_clients_updated_at
  BEFORE UPDATE ON public.b2b_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Liaison : un projet appartient eventuellement a un client
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.b2b_clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
