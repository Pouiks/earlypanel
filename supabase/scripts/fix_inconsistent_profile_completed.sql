-- =====================================================================
-- Script : reparer les testeurs avec profile_completed=true incoherent
-- =====================================================================
--
-- Contexte : avant le renforcement de l'onboarding (PR de 2026-04-28),
-- l'API permettait de poser profile_completed=true sans verifier que
-- TOUS les 18 champs requis du trigger DB etaient remplis. Resultat :
-- certains testeurs ont profile_completed=true MAIS sont en pending
-- car le trigger a refuse l'activation (ex: connection vide).
--
-- Cas concret : browncarenza@gmail.com avait profile_completed=true,
-- status=pending, connection=NULL.
--
-- Ce script :
--   1) Identifie tous les testeurs dans cet etat incoherent
--   2) Remet profile_completed=false pour qu'ils soient re-routes vers
--      l'onboarding (le middleware regarde ce flag pour rediriger)
--
-- Apres execution, ces testeurs verront /app/onboarding au prochain
-- login et pourront completer les champs manquants. Le trigger DB
-- (auto_activate_tester) les passera automatiquement en active des
-- que les 18 champs sont remplis.
--
-- Idempotent : peut etre rejouee sans effet supplementaire.

-- ---------------------------------------------------------------------
-- PARTIE 1 — PREVIEW (a executer d'abord pour voir le perimetre)
-- ---------------------------------------------------------------------

SELECT
  email,
  status,
  profile_completed,
  -- Liste des champs manquants pour audit visuel
  CONCAT_WS(', ',
    CASE WHEN COALESCE(first_name, '') = '' THEN 'first_name' END,
    CASE WHEN COALESCE(last_name, '') = '' THEN 'last_name' END,
    CASE WHEN COALESCE(phone, '') = '' THEN 'phone' END,
    CASE WHEN COALESCE(job_title, '') = '' THEN 'job_title' END,
    CASE WHEN COALESCE(sector, '') = '' THEN 'sector' END,
    CASE WHEN COALESCE(company_size, '') = '' THEN 'company_size' END,
    CASE WHEN COALESCE(digital_level, '') = '' THEN 'digital_level' END,
    CASE WHEN COALESCE(connection, '') = '' THEN 'connection' END,
    CASE WHEN COALESCE(availability, '') = '' THEN 'availability' END,
    CASE WHEN COALESCE(ux_experience, '') = '' THEN 'ux_experience' END,
    CASE WHEN COALESCE(address, '') = '' THEN 'address' END,
    CASE WHEN COALESCE(city, '') = '' THEN 'city' END,
    CASE WHEN COALESCE(postal_code, '') = '' THEN 'postal_code' END,
    CASE WHEN birth_date IS NULL THEN 'birth_date' END,
    CASE WHEN tools IS NULL OR array_length(tools, 1) IS NULL THEN 'tools' END,
    CASE WHEN browsers IS NULL OR array_length(browsers, 1) IS NULL THEN 'browsers' END,
    CASE WHEN devices IS NULL OR array_length(devices, 1) IS NULL THEN 'devices' END,
    CASE WHEN interests IS NULL OR array_length(interests, 1) IS NULL THEN 'interests' END
  ) AS missing_fields
FROM public.testers
WHERE profile_completed = true
  AND (
    COALESCE(first_name, '') = ''
    OR COALESCE(last_name, '') = ''
    OR COALESCE(phone, '') = ''
    OR COALESCE(job_title, '') = ''
    OR COALESCE(sector, '') = ''
    OR COALESCE(company_size, '') = ''
    OR COALESCE(digital_level, '') = ''
    OR COALESCE(connection, '') = ''
    OR COALESCE(availability, '') = ''
    OR COALESCE(ux_experience, '') = ''
    OR COALESCE(address, '') = ''
    OR COALESCE(city, '') = ''
    OR COALESCE(postal_code, '') = ''
    OR birth_date IS NULL
    OR tools IS NULL OR array_length(tools, 1) IS NULL
    OR browsers IS NULL OR array_length(browsers, 1) IS NULL
    OR devices IS NULL OR array_length(devices, 1) IS NULL
    OR interests IS NULL OR array_length(interests, 1) IS NULL
  );

-- ---------------------------------------------------------------------
-- PARTIE 2 — FIX (a executer apres review de la PARTIE 1)
-- ---------------------------------------------------------------------
-- Decommenter le bloc ci-dessous quand la PARTIE 1 retourne le perimetre attendu.
--
-- UPDATE public.testers
-- SET profile_completed = false,
--     status = 'pending',
--     updated_at = NOW()
-- WHERE profile_completed = true
--   AND (
--     COALESCE(first_name, '') = ''
--     OR COALESCE(last_name, '') = ''
--     OR COALESCE(phone, '') = ''
--     OR COALESCE(job_title, '') = ''
--     OR COALESCE(sector, '') = ''
--     OR COALESCE(company_size, '') = ''
--     OR COALESCE(digital_level, '') = ''
--     OR COALESCE(connection, '') = ''
--     OR COALESCE(availability, '') = ''
--     OR COALESCE(ux_experience, '') = ''
--     OR COALESCE(address, '') = ''
--     OR COALESCE(city, '') = ''
--     OR COALESCE(postal_code, '') = ''
--     OR birth_date IS NULL
--     OR tools IS NULL OR array_length(tools, 1) IS NULL
--     OR browsers IS NULL OR array_length(browsers, 1) IS NULL
--     OR devices IS NULL OR array_length(devices, 1) IS NULL
--     OR interests IS NULL OR array_length(interests, 1) IS NULL
--   );
--
-- -- Verification : doit retourner 0
-- SELECT COUNT(*) AS still_inconsistent
-- FROM public.testers
-- WHERE profile_completed = true
--   AND (COALESCE(connection, '') = '' OR COALESCE(address, '') = '' OR ...);
