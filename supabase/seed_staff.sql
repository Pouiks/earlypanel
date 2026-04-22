-- ============================================================
-- Création du premier compte staff
-- ============================================================
--
-- MÉTHODE RECOMMANDÉE : utiliser l'API /api/staff/setup
-- Lancer le serveur Next.js puis exécuter dans un terminal :
--
--   curl -X POST http://localhost:3000/api/staff/setup \
--     -H "Content-Type: application/json" \
--     -d '{
--       "email": "virgilejoinville@gmail.com",
--       "password": "MonMotDePasse123",
--       "first_name": "Virgile",
--       "last_name": "Joinville",
--       "setup_key": "testpanel-setup-2026"
--     }'
--
-- Ou en PowerShell :
--
--   Invoke-RestMethod -Uri "http://localhost:3000/api/staff/setup" `
--     -Method POST `
--     -ContentType "application/json" `
--     -Body '{"email":"virgilejoinville@gmail.com","password":"MonMotDePasse123","first_name":"Virgile","last_name":"Joinville","setup_key":"testpanel-setup-2026"}'
--
-- Cette route crée l'utilisateur dans auth.users avec le mot de passe,
-- attribue le rôle "staff" dans app_metadata,
-- et crée la ligne dans staff_members.
-- Tout en une seule commande.
--
-- La clé setup_key est définie dans .env.local (STAFF_SETUP_KEY).
-- Changez-la après le premier usage.
--
-- ============================================================
-- MÉTHODE ALTERNATIVE : SQL direct (si l'user existe déjà dans auth.users)
-- ============================================================

-- Étape 1 : Attribuer le rôle staff dans app_metadata
-- UPDATE auth.users
-- SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "staff"}'::jsonb
-- WHERE email = 'virgilejoinville@gmail.com';

-- Étape 2 : Créer la ligne dans staff_members
-- INSERT INTO public.staff_members (auth_user_id, email, first_name, last_name, role)
-- SELECT id, email, 'Virgile', 'Joinville', 'admin'
-- FROM auth.users
-- WHERE email = 'virgilejoinville@gmail.com'
-- ON CONFLICT (email) DO NOTHING;

-- Vérification
SELECT sm.*, au.raw_app_meta_data->>'role' as auth_role
FROM public.staff_members sm
JOIN auth.users au ON au.id = sm.auth_user_id;
