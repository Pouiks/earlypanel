-- Malus NDA non signe a la cloture (idempotence separee de malus mission deadline)
ALTER TABLE public.project_testers
  ADD COLUMN IF NOT EXISTS malus_nda_unsigned_applied BOOLEAN NOT NULL DEFAULT FALSE;

-- Remuneration de base au niveau projet (centimes)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS base_reward_cents INTEGER,
  ADD COLUMN IF NOT EXISTS tier_rewards JSONB;

COMMENT ON COLUMN public.projects.base_reward_cents IS 'Montant de base en centimes si pas de grille par tier';
COMMENT ON COLUMN public.projects.tier_rewards IS 'Optionnel: {"standard":2000,"expert":2500,"premium":3000} en centimes';

-- Versements testeurs (un enregistrement par project_tester une fois evalue)
CREATE TABLE IF NOT EXISTS public.tester_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tester_id UUID NOT NULL REFERENCES public.testers(id) ON DELETE CASCADE,
  project_tester_id UUID NOT NULL REFERENCES public.project_testers(id) ON DELETE CASCADE,
  calculated_amount_cents INTEGER NOT NULL DEFAULT 0,
  final_amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'failed')),
  stripe_transfer_id TEXT,
  idempotency_key TEXT UNIQUE,
  paid_at TIMESTAMPTZ,
  last_error TEXT,
  UNIQUE(project_tester_id)
);

CREATE INDEX IF NOT EXISTS idx_tester_payouts_project ON public.tester_payouts(project_id);
CREATE INDEX IF NOT EXISTS idx_tester_payouts_tester ON public.tester_payouts(tester_id);
CREATE INDEX IF NOT EXISTS idx_tester_payouts_status ON public.tester_payouts(status);

ALTER TABLE public.tester_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tester_payouts_no_direct" ON public.tester_payouts
  FOR ALL USING (false);

CREATE TRIGGER tester_payouts_updated_at
  BEFORE UPDATE ON public.tester_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
