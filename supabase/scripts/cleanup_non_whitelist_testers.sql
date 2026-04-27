-- =====================================================================
-- SCRIPT DESTRUCTIF — Purge des testeurs hors whitelist
-- =====================================================================
--
-- /!\  À EXÉCUTER MANUELLEMENT, EN UNE SEULE FOIS, EN PRODUCTION.
-- /!\  REVIEW LA WHITELIST AVANT D'EXECUTER.
-- /!\  PAS DE ROLLBACK POSSIBLE SUR auth.users (CASCADE detruit les sessions).
--
-- Ce script :
--   1) Affiche le perimetre exact (preview)
--   2) Supprime les lignes `testers` hors whitelist (CASCADE → project_testers,
--      tester_payouts, tester_score_events, etc.)
--   3) Supprime les `auth.users` correspondants (les comptes qui n'avaient
--      qu'un role tester / pas de role staff)
--
-- Les staff (entries dans staff_members) sont protégés : on ne supprime
-- jamais une auth.users qui a une ligne dans staff_members.
--
-- Usage recommandé :
--   1) Lancer la PARTIE 1 (BEGIN + preview, sans COMMIT) pour vérifier
--   2) Si OK, lancer la PARTIE 2 dans un BEGIN/COMMIT
--   3) Le BEGIN/COMMIT global permet de faire un ROLLBACK si surprise dans
--      les preview counts
--
-- Date du choix : 2026-04-27 (Option A confirmée par le proprietaire)
-- Whitelist : benjaminbrunet63@gmail.com, samuel.brunet16@hotmail.com
-- =====================================================================

-- ---------------------------------------------------------------------
-- PARTIE 1 — PREVIEW (a executer d'abord, sans modifier la DB)
-- ---------------------------------------------------------------------
-- Lancer ces SELECT pour verifier le perimetre :

SELECT 'testers a supprimer' AS scope, COUNT(*) AS n
FROM public.testers
WHERE LOWER(email) NOT IN ('benjaminbrunet63@gmail.com', 'samuel.brunet16@hotmail.com');

SELECT 'testers conservés' AS scope, COUNT(*) AS n, ARRAY_AGG(email) AS emails
FROM public.testers
WHERE LOWER(email) IN ('benjaminbrunet63@gmail.com', 'samuel.brunet16@hotmail.com');

-- Volume des entites liees (impact CASCADE) :
SELECT 'project_testers a supprimer' AS scope, COUNT(*) AS n
FROM public.project_testers pt
JOIN public.testers t ON t.id = pt.tester_id
WHERE LOWER(t.email) NOT IN ('benjaminbrunet63@gmail.com', 'samuel.brunet16@hotmail.com');

SELECT 'tester_payouts a supprimer' AS scope, COUNT(*) AS n
FROM public.tester_payouts tp
JOIN public.testers t ON t.id = tp.tester_id
WHERE LOWER(t.email) NOT IN ('benjaminbrunet63@gmail.com', 'samuel.brunet16@hotmail.com');

SELECT 'auth.users a supprimer (testers hors whitelist, sans staff_members)' AS scope, COUNT(*) AS n
FROM auth.users au
JOIN public.testers t ON t.auth_user_id = au.id
LEFT JOIN public.staff_members sm ON sm.auth_user_id = au.id
WHERE LOWER(t.email) NOT IN ('benjaminbrunet63@gmail.com', 'samuel.brunet16@hotmail.com')
  AND sm.id IS NULL;


-- ---------------------------------------------------------------------
-- PARTIE 2 — PURGE (a executer UNIQUEMENT apres verification de la PARTIE 1)
-- ---------------------------------------------------------------------
-- Decommenter ce bloc et l'executer EN UNE SEULE FOIS dans le SQL Editor.
-- Le CTE garantit que la collecte des auth_user_id et la suppression
-- s'executent dans la meme requete (pas de TEMP TABLE qui pourrait
-- disparaitre entre deux statements dans certains contextes).
--
-- WITH targets AS (
--   SELECT t.id AS tester_id, t.auth_user_id
--   FROM public.testers t
--   WHERE LOWER(t.email) NOT IN ('benjaminbrunet63@gmail.com', 'samuel.brunet16@hotmail.com')
-- ),
-- deleted_testers AS (
--   DELETE FROM public.testers
--   WHERE id IN (SELECT tester_id FROM targets)
--   RETURNING id, auth_user_id
-- )
-- DELETE FROM auth.users
-- WHERE id IN (
--   SELECT dt.auth_user_id
--   FROM deleted_testers dt
--   LEFT JOIN public.staff_members sm ON sm.auth_user_id = dt.auth_user_id
--   WHERE dt.auth_user_id IS NOT NULL
--     AND sm.id IS NULL
-- );
--
-- -- Verification finale (lancer en SELECT separe apres la requete ci-dessus)
-- SELECT COUNT(*) AS testers_restants FROM public.testers;
-- SELECT email FROM public.testers ORDER BY email;
