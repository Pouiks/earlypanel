-- =====================================================================
-- Migration 018 : Champs Audit Lighthouse sur projects (Tranche 6)
-- =====================================================================
-- Saisis manuellement par le staff en fin de mission.
-- Conditionnels a audit_enabled = true (deja en base depuis migration 014).
-- =====================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS audit_performance_score INTEGER CHECK (audit_performance_score BETWEEN 0 AND 100);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS audit_accessibility_score INTEGER CHECK (audit_accessibility_score BETWEEN 0 AND 100);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS audit_seo_score INTEGER CHECK (audit_seo_score BETWEEN 0 AND 100);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS audit_best_practices_score INTEGER CHECK (audit_best_practices_score BETWEEN 0 AND 100);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS audit_findings TEXT[] DEFAULT '{}';
