-- =====================================================================
-- Migration 014 : Champs contexte rapport sur projects (Tranche 1)
-- =====================================================================
-- Alimente les pages 1 et 3 du rapport de mission (couverture + contexte).
-- Tous nullable avec defaut vide : les projets existants ne sont pas impactes.
-- =====================================================================

-- Objectif business du test (page 3 « Pourquoi ce test »)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS business_objective TEXT;

-- Perimetres inclus et exclus (page 3 « Ce qui a ete teste »)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS scope_included TEXT[] DEFAULT '{}';

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS scope_excluded TEXT[] DEFAULT '{}';

-- Consignes specifiques du client (page 3 « Les consignes du client »)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_guidelines TEXT;

-- Type de test : modere ou non modere (page 3, pill methodologie)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS test_type TEXT DEFAULT 'unmoderated'
    CHECK (test_type IN ('moderated', 'unmoderated'));

-- Active/desactive l'audit Lighthouse (page 9, conditionnelle)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS audit_enabled BOOLEAN DEFAULT FALSE;
