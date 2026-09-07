-- =====================================================================
-- Migration 038 : Normalisation du ciblage projet
-- =====================================================================
-- ProjectForm ecrivait des libelles francais (« Homme », « Cadres / Prof.
-- intellectuelles ») et un secteur en texte libre, alors que les filtres
-- comparent aux valeurs stockees dans `testers` (male/female/non_binary,
-- CSP taxonomy, SECTORS). Resultat : un projet cible « Femme » ne matchait
-- que les testeurs sans genre renseigne. On aligne les projets existants.
-- Les colonnes et donnees `testers` ne sont PAS touchees.
-- Idempotent : re-jouable sans effet.
-- =====================================================================

-- 1) Genre : libelles FR -> valeurs DB testeurs
UPDATE public.projects
SET target_gender = (
  SELECT COALESCE(array_agg(DISTINCT v), '{}')
  FROM unnest(target_gender) AS g,
  LATERAL (SELECT CASE g
    WHEN 'Homme' THEN 'male'
    WHEN 'Femme' THEN 'female'
    WHEN 'Autre' THEN 'non_binary'
    ELSE g END AS v) m
  WHERE v IN ('male', 'female', 'non_binary', 'prefer_not_to_say')
)
WHERE target_gender IS NOT NULL AND array_length(target_gender, 1) > 0;

-- 2) CSP : anciens libelles ProjectForm -> taxonomy CSPS
UPDATE public.projects
SET target_csp = (
  SELECT COALESCE(array_agg(DISTINCT v), '{}')
  FROM unnest(target_csp) AS c,
  LATERAL (SELECT CASE c
    WHEN 'Cadres / Prof. intellectuelles' THEN 'Cadre / Profession intellectuelle supérieure'
    WHEN 'Professions intermédiaires' THEN 'Profession intermédiaire'
    WHEN 'Employés' THEN 'Employé'
    WHEN 'Ouvriers' THEN 'Ouvrier'
    WHEN 'Retraités' THEN 'Retraité'
    WHEN 'Étudiants' THEN 'Étudiant'
    WHEN 'Artisans / Commerçants' THEN 'Indépendant / Auto-entrepreneur'
    ELSE c END AS v) m
  WHERE v IN ('Étudiant', 'Cadre / Profession intellectuelle supérieure', 'Profession intermédiaire',
              'Employé', 'Indépendant / Auto-entrepreneur', 'Ouvrier', 'Retraité', 'Sans activité')
)
WHERE target_csp IS NOT NULL AND array_length(target_csp, 1) > 0;

-- 3) Secteur libre -> SECTORS quand un mot-cle le permet. Les valeurs non
--    reconnues sont conservees : le formulaire les affiche comme « valeur
--    libre, ne filtre pas » jusqu'a ce que le staff choisisse dans la liste.
UPDATE public.projects
SET target_sector = CASE
  WHEN target_sector ILIKE '%banque%' OR target_sector ILIKE '%finance%' OR target_sector ILIKE '%fintech%' THEN 'Finance / Banque'
  WHEN target_sector ILIKE '%assur%' THEN 'Assurance'
  WHEN target_sector ILIKE '%sant%' OR target_sector ILIKE '%pharma%' OR target_sector ILIKE '%health%' OR target_sector ILIKE '%médic%' OR target_sector ILIKE '%medic%' THEN 'Santé / Pharma'
  WHEN target_sector ILIKE '%compta%' THEN 'Comptabilité / Expertise comptable'
  WHEN target_sector ILIKE '%tech%' OR target_sector ILIKE '%saas%' OR target_sector ILIKE '%logiciel%' OR target_sector ILIKE '%software%' OR target_sector ILIKE '%informati%' OR target_sector ILIKE 'IT' THEN 'Tech / IT / Software'
  WHEN target_sector ILIKE '%e-commerce%' OR target_sector ILIKE '%ecommerce%' THEN 'E-commerce'
  WHEN target_sector ILIKE '%retail%' OR target_sector ILIKE '%commerce%' THEN 'Commerce / Retail'
  WHEN target_sector ILIKE '%éduc%' OR target_sector ILIKE '%educ%' OR target_sector ILIKE '%formation%' THEN 'Éducation / Formation'
  WHEN target_sector ILIKE '%transport%' OR target_sector ILIKE '%logisti%' THEN 'Transport / Logistique'
  WHEN target_sector ILIKE '%industri%' THEN 'Industrie / Manufacturing'
  WHEN target_sector ILIKE '%btp%' OR target_sector ILIKE '%construction%' OR target_sector ILIKE '%architect%' THEN 'BTP / Construction / Architecture'
  WHEN target_sector ILIKE '%énergie%' OR target_sector ILIKE '%energie%' THEN 'Énergie'
  WHEN target_sector ILIKE '%touris%' OR target_sector ILIKE '%hôtel%' OR target_sector ILIKE '%hotel%' OR target_sector ILIKE '%restaur%' THEN 'Tourisme / Hôtellerie / Restauration'
  WHEN target_sector ILIKE '%média%' OR target_sector ILIKE '%media%' OR target_sector ILIKE '%communication%' THEN 'Médias / Communication'
  WHEN target_sector ILIKE '%marketing%' OR target_sector ILIKE '%publicit%' THEN 'Marketing / Publicité'
  WHEN target_sector ILIKE '%RH%' OR target_sector ILIKE '%recrut%' OR target_sector ILIKE '%ressources humaines%' THEN 'RH / Recrutement'
  WHEN target_sector ILIKE '%juridi%' OR target_sector ILIKE '%legal%' OR target_sector ILIKE '%avocat%' THEN 'Juridique'
  WHEN target_sector ILIKE '%immo%' THEN 'Immobilier'
  WHEN target_sector ILIKE '%conseil%' OR target_sector ILIKE '%consulting%' THEN 'Conseil / Services aux entreprises'
  WHEN target_sector ILIKE '%public%' OR target_sector ILIKE '%administration%' THEN 'Fonction publique / Administration'
  WHEN target_sector ILIKE '%associ%' OR target_sector ILIKE '%ONG%' THEN 'Associatif / ONG'
  WHEN target_sector ILIKE '%agric%' THEN 'Agriculture'
  ELSE target_sector END
WHERE target_sector IS NOT NULL AND target_sector <> ''
  AND target_sector NOT IN ('Tech / IT / Software','Finance / Banque','Assurance','Santé / Pharma','Comptabilité / Expertise comptable','Recherche / R&D','Éducation / Formation','Industrie / Manufacturing','Agroalimentaire','BTP / Construction / Architecture','Énergie','Transport / Logistique','Commerce / Retail','E-commerce','Tourisme / Hôtellerie / Restauration','Médias / Communication','Marketing / Publicité','RH / Recrutement','Juridique','Immobilier','Conseil / Services aux entreprises','Fonction publique / Administration','Associatif / ONG','Agriculture','Autre');

-- Verification :
--   SELECT id, title, target_gender, target_csp, target_sector FROM projects
--   WHERE target_sector IS NOT NULL OR array_length(target_gender,1) > 0 OR array_length(target_csp,1) > 0;
