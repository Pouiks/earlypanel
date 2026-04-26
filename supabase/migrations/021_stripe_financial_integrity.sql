-- =====================================================================
-- Migration 021 (G8) : integrite financiere Stripe
-- =====================================================================
-- 1) Dedup des webhooks Stripe par event.id pour empecher un double
--    traitement (Stripe peut rejouer un meme event N fois).
-- 2) Ledger de credit `total_earned` par payout_id, idempotent : credit
--    UNE seule fois par payout, et reversible sur transfer.reversed.

-- ---------------------------------------------------------------------
-- Table : stripe_webhook_events (dedup)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stripe_events_service_role_only"
  ON public.stripe_webhook_events FOR ALL USING (false);

-- record_stripe_event : retourne TRUE si l'event est nouveau, FALSE si deja vu.
CREATE OR REPLACE FUNCTION public.record_stripe_event(
  p_event_id TEXT,
  p_event_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_inserted BOOLEAN;
BEGIN
  INSERT INTO public.stripe_webhook_events (event_id, event_type)
  VALUES (p_event_id, p_event_type)
  ON CONFLICT (event_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- Table : tester_earnings_ledger (un credit unique par payout)
-- ---------------------------------------------------------------------
-- Permet l'idempotence : un payout_id ne peut etre credite qu'une seule
-- fois, peu importe combien de fois la fonction est appelee.
CREATE TABLE IF NOT EXISTS public.tester_earnings_ledger (
  payout_id UUID PRIMARY KEY REFERENCES public.tester_payouts(id) ON DELETE CASCADE,
  tester_id UUID NOT NULL REFERENCES public.testers(id) ON DELETE CASCADE,
  amount_euros NUMERIC NOT NULL,
  credited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reverted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_earnings_ledger_tester
  ON public.tester_earnings_ledger(tester_id);

ALTER TABLE public.tester_earnings_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "earnings_ledger_service_role_only"
  ON public.tester_earnings_ledger FOR ALL USING (false);

-- credit_tester_earnings : credite total_earned une seule fois par payout_id.
-- Retourne TRUE si credit applique, FALSE si deja credite.
CREATE OR REPLACE FUNCTION public.credit_tester_earnings(
  p_payout_id UUID,
  p_tester_id UUID,
  p_amount_euros NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  v_inserted BOOLEAN;
BEGIN
  INSERT INTO public.tester_earnings_ledger (payout_id, tester_id, amount_euros)
  VALUES (p_payout_id, p_tester_id, p_amount_euros)
  ON CONFLICT (payout_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted THEN
    UPDATE public.testers
    SET total_earned = COALESCE(total_earned, 0) + p_amount_euros
    WHERE id = p_tester_id;
  END IF;

  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- revert_tester_earnings : annule un credit precedent (transfer.reversed).
-- Retourne TRUE si une annulation a ete effectuee, FALSE si rien a annuler.
CREATE OR REPLACE FUNCTION public.revert_tester_earnings(
  p_payout_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_tester UUID;
  v_amount NUMERIC;
BEGIN
  SELECT tester_id, amount_euros INTO v_tester, v_amount
  FROM public.tester_earnings_ledger
  WHERE payout_id = p_payout_id AND reverted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE public.testers
  SET total_earned = GREATEST(COALESCE(total_earned, 0) - v_amount, 0)
  WHERE id = v_tester;

  UPDATE public.tester_earnings_ledger
  SET reverted_at = now()
  WHERE payout_id = p_payout_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
