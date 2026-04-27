-- =====================================================================
-- Migration 026 : profil testeur strict (champs NDA requis pour activation)
-- =====================================================================
-- Avant cette migration, un testeur pouvait passer status='active' sans
-- avoir rempli address/city/postal_code/birth_date. Or ces champs sont
-- injectes dans le PDF du NDA → preuve juridique avec "[adresse non
-- renseignee]" possible. Cette migration corrige en :
--   1) Ajoutant ces 4 champs aux conditions d'activation du trigger
--      auto_activate_tester() (BEFORE UPDATE).
--   2) Repassant en `pending` les testeurs deja `active` mais incomplets
--      (backfill retroactif). Ils devront completer leur profil pour
--      redevenir invitables.
--
-- Choix Option A (strict retroactif) confirme par le proprietaire.
--
-- Idempotente : le CREATE OR REPLACE et l'UPDATE ne creent pas de
-- duplicats si rejouee.

CREATE OR REPLACE FUNCTION public.auto_activate_tester()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne fait rien si on n'est pas en transition depuis pending.
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- Champs texte obligatoires (existants - identite + pro + tech + prefs)
  IF COALESCE(NEW.first_name, '') = '' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.last_name, '') = '' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.phone, '') = '' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.job_title, '') = '' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.sector, '') = '' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.company_size, '') = '' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.digital_level, '') = '' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.connection, '') = '' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.availability, '') = '' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.ux_experience, '') = '' THEN RETURN NEW; END IF;

  -- NOUVEAU : champs NDA obligatoires (utilises dans le PDF)
  IF COALESCE(NEW.address, '') = '' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.city, '') = '' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.postal_code, '') = '' THEN RETURN NEW; END IF;
  IF NEW.birth_date IS NULL THEN RETURN NEW; END IF;

  -- Champs tableau obligatoires (au moins 1 element)
  IF NEW.tools IS NULL OR array_length(NEW.tools, 1) IS NULL THEN RETURN NEW; END IF;
  IF NEW.browsers IS NULL OR array_length(NEW.browsers, 1) IS NULL THEN RETURN NEW; END IF;
  IF NEW.devices IS NULL OR array_length(NEW.devices, 1) IS NULL THEN RETURN NEW; END IF;
  IF NEW.interests IS NULL OR array_length(NEW.interests, 1) IS NULL THEN RETURN NEW; END IF;

  -- Tous les champs requis sont remplis → activation
  NEW.status := 'active';
  NEW.profile_completed := true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- Backfill retroactif : repasser en `pending` tous les testeurs `active`
-- qui ne respectent pas les nouvelles conditions strictes.
-- =====================================================================
-- IMPORTANT : on ne touche pas aux statuts `suspended` ou `rejected`
-- (decisions metier separees). Seuls les `active` sont concernes.
--
-- Le RAISE NOTICE remonte le compte affecte dans les logs Supabase pour
-- audit operationnel.

DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  WITH demoted AS (
    UPDATE public.testers
    SET status = 'pending',
        profile_completed = false,
        updated_at = NOW()
    WHERE status = 'active'
      AND (
        COALESCE(address, '') = ''
        OR COALESCE(city, '') = ''
        OR COALESCE(postal_code, '') = ''
        OR birth_date IS NULL
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO affected_count FROM demoted;

  RAISE NOTICE '[migration 026] % testeurs repasses en pending pour profil incomplet (champs NDA manquants)', affected_count;
END
$$;

COMMENT ON FUNCTION public.auto_activate_tester() IS
'BEFORE UPDATE trigger : passe testers.status pending->active + profile_completed=true UNIQUEMENT si tous les 18 champs requis sont remplis (10 texte pro/perso + 4 NDA + 4 tableaux). Voir migration 026.';
