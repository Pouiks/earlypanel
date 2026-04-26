-- =====================================================================
-- Migration 024 : staff_audit_log (tracabilite des actions sensibles)
-- =====================================================================
-- Enregistre les actions importantes effectuees par les membres staff
-- pour permettre :
--   1) un audit a posteriori en cas d'incident (qui a fait quoi, quand),
--   2) une analyse de support si un client conteste une operation,
--   3) la detection de comportements anormaux (script kid, compte vole).
--
-- La table est en append-only (pas d'UPDATE/DELETE) cote service, et
-- accessible en lecture uniquement aux staff via une vue dediee si besoin
-- ulterieurement.

CREATE TABLE IF NOT EXISTS public.staff_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  staff_email TEXT,                            -- denormalise pour le cas ou staff_id est supprime
  action TEXT NOT NULL,                        -- ex: 'project_tester.delete', 'payout.pay'
  entity_type TEXT,                            -- ex: 'project_tester', 'payout', 'tester'
  entity_id UUID,                              -- id de l'entite ciblee
  metadata JSONB,                              -- payload contextuel (ex: tester_ids, amount)
  ip TEXT,                                     -- IP du client a l'origine de l'action
  user_agent TEXT,                             -- UA pour aider au debug
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_audit_staff
  ON public.staff_audit_log(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_audit_entity
  ON public.staff_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_created_at
  ON public.staff_audit_log(created_at DESC);

ALTER TABLE public.staff_audit_log ENABLE ROW LEVEL SECURITY;
-- Aucune policy : seul service_role peut acceder. Les staff ne lisent
-- l'audit log que via une route /api dediee si besoin futur.
CREATE POLICY "audit_log_service_role_only"
  ON public.staff_audit_log FOR ALL USING (false);

COMMENT ON TABLE public.staff_audit_log IS
'Append-only audit log des actions sensibles effectuees par les staff.';
