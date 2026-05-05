# Règles pour `supabase/migrations/*.sql`

Migrations Postgres, jouées via Supabase SQL Editor. **Numérotation séquentielle** (`033_`, `034_`, ...) — pas de timestamp, pas de nom de branche.

## 1. RLS systématique

Toute nouvelle table :

```sql
CREATE TABLE public.ma_table (...);
ALTER TABLE public.ma_table ENABLE ROW LEVEL SECURITY;

-- Anon : aucun accès direct
CREATE POLICY "anon_no_access" ON public.ma_table
  FOR ALL TO anon USING (false);

-- Authenticated : selon le besoin métier
CREATE POLICY "tester_own_rows" ON public.ma_table
  FOR SELECT TO authenticated USING (tester_id = auth.uid());

-- Service role contourne automatiquement RLS, pas besoin de policy explicite
```

**Aucune exception**. Une table sans RLS = données exposées à `anon` via PostgREST.

## 2. RPC SECURITY DEFINER : pattern complet

Toute fonction `SECURITY DEFINER` (qui contourne RLS) DOIT :

```sql
CREATE OR REPLACE FUNCTION public.ma_rpc(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp  -- ← OBLIGATOIRE
AS $$
BEGIN
  -- ...
END;
$$;

-- Toujours après la création :
REVOKE EXECUTE ON FUNCTION public.ma_rpc(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ma_rpc(...) TO service_role;
```

### Pourquoi `extensions` dans search_path

Sur Supabase, **pgcrypto** (et autres extensions) est installé dans le schéma `extensions`, pas `public`. Si `search_path = public, pg_temp`, les appels à `pgp_sym_encrypt(...)` échouent avec :

> `function pgp_sym_encrypt(text, text) does not exist`

**Bug réel survenu** : migrations 027, 028, 030 ne contenaient pas `extensions` dans le search_path. Migration 033 a corrigé ça en ALTER FUNCTION rétroactivement. Toute nouvelle RPC qui touche `pgp_sym_encrypt`, `crypt`, `digest` doit inclure `extensions`.

### Pourquoi `REVOKE FROM PUBLIC`

Par défaut, `CREATE FUNCTION` accorde EXECUTE à `PUBLIC` (= rôle `anon` inclus). Si on oublie `REVOKE`, n'importe qui peut appeler la RPC en bypass de RLS.

Référence : `migrations/023_lockdown_rpcs.sql`.

## 3. Idempotence

```sql
-- ✅ Réplayable
CREATE TABLE IF NOT EXISTS public.ma_table (...);
CREATE INDEX IF NOT EXISTS ix_ma_table_user ON public.ma_table(user_id);
CREATE OR REPLACE FUNCTION public.ma_rpc(...) RETURNS ... AS $$ ... $$;

-- ❌ Casse si rejoué
CREATE TABLE public.ma_table (...);
ALTER TABLE public.ma_table ADD COLUMN foo TEXT; -- échoue si col existe
```

Pour les `ALTER TABLE ADD COLUMN` :
```sql
ALTER TABLE public.ma_table
  ADD COLUMN IF NOT EXISTS foo TEXT;
```

## 4. Tables append-only (audit log)

```sql
CREATE TABLE public.staff_audit_log (...);
ALTER TABLE public.staff_audit_log ENABLE ROW LEVEL SECURITY;

-- INSERT autorisé uniquement via RPC ou service_role
-- UPDATE / DELETE refusés à TOUS, y compris service_role
CREATE POLICY "no_update" ON public.staff_audit_log FOR UPDATE USING (false);
CREATE POLICY "no_delete" ON public.staff_audit_log FOR DELETE USING (false);
```

⚠️ Une fois `USING(false)` posé sur UPDATE/DELETE, **même `service_role` ne peut plus modifier**. Si tu as besoin de purger pour un GDPR Right to Erasure, ça passe par une RPC dédiée avec `SECURITY DEFINER` qui logue la suppression.

## 5. Numérotation et historique

```
027_tester_payment_info.sql       ← chiffrement IBAN
028_question_types.sql            ← questions binary/scale/text
029_payouts.sql                   ← table tester_payouts
030_csp_pg_trgm.sql               ← taxonomie + recherche fuzzy
031_backfill_sectors.sql          ← migration data
032_decrement_missions_completed  ← compteur testeur
033_fix_pgcrypto_search_path      ← FIX bug search_path (cf. règle #2)
```

**Toute nouvelle migration prend le numéro +1**. Pas de réécriture rétroactive (`027` a été figée le jour où elle a été appliquée en prod).

## 6. Données sensibles

- IBANs stockés via `pgp_sym_encrypt(iban_clear, encryption_key)` → `bytea`.
- `encryption_key` = `IBAN_ENCRYPTION_KEY` (env Vercel), JAMAIS hardcodé en SQL.
- Last4 stocké en clair (`iban_last4 VARCHAR(4)`) pour affichage UI.

## 7. Test post-application

Dans Supabase SQL Editor, après chaque migration :

```sql
-- Vérifier search_path des RPC sensibles
SELECT proname, proconfig
FROM pg_proc
WHERE proname IN ('upsert_tester_payment_info', 'decrypt_tester_iban')
  AND pronamespace = 'public'::regnamespace;
-- proconfig doit contenir 'search_path=public, extensions, pg_temp'

-- Vérifier RLS activée
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- rowsecurity = true sur toutes les tables métier
```

## Checklist avant commit migration

- [ ] Numéro séquentiel correct (dernière + 1)
- [ ] `IF NOT EXISTS` / `CREATE OR REPLACE` partout
- [ ] Toute nouvelle table : `ENABLE ROW LEVEL SECURITY` + policies
- [ ] Toute nouvelle RPC SECURITY DEFINER : `SET search_path = public, extensions, pg_temp` + `REVOKE FROM PUBLIC` + `GRANT TO service_role`
- [ ] Si table append-only : policies `no_update` + `no_delete`
- [ ] Pas de secret hardcodé en SQL
- [ ] Bloc DO $$ NOTICE en fin pour vérification (optionnel mais recommandé)
- [ ] Test en local OU sur Supabase test branch AVANT prod
