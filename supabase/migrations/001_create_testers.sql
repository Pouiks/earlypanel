-- Create testers table
CREATE TABLE IF NOT EXISTS public.testers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  linkedin_url TEXT,
  job_title TEXT,
  sector TEXT,
  company_size TEXT,
  digital_level TEXT CHECK (digital_level IN ('debutant', 'intermediaire', 'avance', 'expert')),
  tools TEXT[] DEFAULT '{}',
  browsers TEXT[] DEFAULT '{}',
  devices TEXT[] DEFAULT '{}',
  phone_model TEXT,
  mobile_os TEXT,
  connection TEXT CHECK (connection IN ('Fibre', 'ADSL', '4G/5G')),
  availability TEXT CHECK (availability IN ('1-2', '3-5', '5+')),
  timeslots TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  ux_experience TEXT CHECK (ux_experience IN ('Jamais', 'Quelquefois', 'Régulièrement')),
  source TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  stripe_account_id TEXT,
  payment_setup BOOLEAN DEFAULT FALSE,
  quality_score INTEGER DEFAULT 50,
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'expert', 'premium')),
  missions_completed INTEGER DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_completed BOOLEAN DEFAULT FALSE,
  profile_step INTEGER DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_testers_auth_user_id ON public.testers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_testers_email ON public.testers(email);
CREATE INDEX IF NOT EXISTS idx_testers_status ON public.testers(status);

-- Enable RLS
ALTER TABLE public.testers ENABLE ROW LEVEL SECURITY;

-- Tester can read own row
CREATE POLICY "testers_select_own" ON public.testers
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Tester can update own row
CREATE POLICY "testers_update_own" ON public.testers
  FOR UPDATE USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Insert only via service role (API routes)
CREATE POLICY "testers_insert_service_role" ON public.testers
  FOR INSERT WITH CHECK (false);
-- Service role bypasses RLS, so inserts from API routes will work.

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER testers_updated_at
  BEFORE UPDATE ON public.testers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
