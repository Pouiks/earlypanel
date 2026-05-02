-- =====================================================================
-- Migration 028 : Types de question + question conditionnelle + hint min_chars
-- =====================================================================
-- Ajoute trois mecaniques dans project_questions :
--   - question_type ('text' | 'binary' | 'scale_1_5') — defaut 'text'
--   - parent_question_id + parent_show_when_values — pour les questions
--     conditionnelles revelees uniquement si la reponse du parent (binary)
--     correspond a une valeur listee
--   - min_chars_hint — suggestion soft de longueur minimale (non bloquante)
--
-- Pour les reponses : on conserve la colonne project_answers.answer_text
-- (TEXT). Conventions cote applicatif :
--   - text         : answer_text = texte libre
--   - binary       : answer_text in ('yes','no','partial')
--   - scale_1_5    : answer_text in ('1','2','3','4','5')
-- Pas de CHECK cote DB pour ne pas bloquer une evolution future des
-- valeurs (cas 'unsure' par exemple). Validation cote API + UI.
-- =====================================================================

-- 1. Colonnes nouvelles sur project_questions ----------------------------

ALTER TABLE public.project_questions
  ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'text'
    CHECK (question_type IN ('text', 'binary', 'scale_1_5'));

ALTER TABLE public.project_questions
  ADD COLUMN IF NOT EXISTS parent_question_id UUID
    REFERENCES public.project_questions(id) ON DELETE SET NULL;

-- Tableau des valeurs du parent qui revelent cette question.
-- Vide ou NULL = pas de condition (question toujours affichee).
-- Exemple : parent binary avec parent_show_when_values = ARRAY['no','partial']
-- → question revelee uniquement si le testeur repond Non ou Partiellement.
ALTER TABLE public.project_questions
  ADD COLUMN IF NOT EXISTS parent_show_when_values TEXT[];

-- Suggestion (soft, non bloquante) de longueur minimale pour les questions
-- text. NULL = aucune suggestion.
ALTER TABLE public.project_questions
  ADD COLUMN IF NOT EXISTS min_chars_hint INTEGER
    CHECK (min_chars_hint IS NULL OR min_chars_hint > 0);

-- 2. Index sur parent_question_id pour les jointures cote API -----------

CREATE INDEX IF NOT EXISTS idx_questions_parent_question_id
  ON public.project_questions(parent_question_id);

-- 3. Garde-fou : un parent doit etre dans le meme projet ---------------
-- On le verifie cote API (plus simple que CHECK + RLS). Pas d'add ici.
