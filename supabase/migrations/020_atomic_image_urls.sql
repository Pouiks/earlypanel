-- =====================================================================
-- Migration 020 (G7) : RPC atomiques pour gerer image_urls
-- =====================================================================
-- Empeche les "lost updates" et les depassements de plafond quand un
-- testeur upload deux images en parallele : sans verrou, deux requetes
-- peuvent toutes deux lire la meme liste, ajouter leur path, et ecraser
-- l'autre. La RPC fait l'upsert + le check de plafond dans une seule
-- transaction PostgreSQL avec UPDATE/INSERT atomique.

-- ---------------------------------------------------------------------
-- append_image_to_answer
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_image_to_answer(
  p_project_id UUID,
  p_tester_id UUID,
  p_question_id UUID,
  p_path TEXT,
  p_max_per_question INTEGER,
  p_max_per_mission INTEGER
) RETURNS TEXT[] AS $$
DECLARE
  v_total INTEGER;
  v_current TEXT[];
  v_new TEXT[];
  v_existed BOOLEAN;
BEGIN
  -- Verrou ligne-niveau si une reponse existe deja (FOR UPDATE).
  SELECT image_urls INTO v_current
  FROM public.project_tester_answers
  WHERE project_id = p_project_id
    AND tester_id = p_tester_id
    AND question_id = p_question_id
  FOR UPDATE;

  v_existed := FOUND;
  v_current := COALESCE(v_current, ARRAY[]::TEXT[]);

  -- Idempotence : si le path est deja present, on n'ajoute rien.
  IF p_path = ANY(v_current) THEN
    RETURN v_current;
  END IF;

  -- Plafond par question.
  IF array_length(v_current, 1) IS NOT NULL
     AND array_length(v_current, 1) >= p_max_per_question THEN
    RAISE EXCEPTION 'images_per_question_limit_exceeded'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Plafond par mission (somme sur toutes les questions, on verrouille
  -- l'ensemble des reponses du testeur sur ce projet pour eviter une race
  -- avec un autre upload concurrent sur une autre question).
  SELECT COALESCE(SUM(COALESCE(array_length(image_urls, 1), 0)), 0) INTO v_total
  FROM public.project_tester_answers
  WHERE project_id = p_project_id
    AND tester_id = p_tester_id
  FOR UPDATE;

  IF v_total >= p_max_per_mission THEN
    RAISE EXCEPTION 'images_per_mission_limit_exceeded'
      USING ERRCODE = 'check_violation';
  END IF;

  v_new := array_append(v_current, p_path);

  IF v_existed THEN
    UPDATE public.project_tester_answers
    SET image_urls = v_new,
        updated_at = now()
    WHERE project_id = p_project_id
      AND tester_id = p_tester_id
      AND question_id = p_question_id;
  ELSE
    INSERT INTO public.project_tester_answers
      (project_id, tester_id, question_id, answer_text, image_urls)
    VALUES
      (p_project_id, p_tester_id, p_question_id, '', v_new);
  END IF;

  RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- remove_image_from_answer
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_image_from_answer(
  p_project_id UUID,
  p_tester_id UUID,
  p_question_id UUID,
  p_path TEXT
) RETURNS TEXT[] AS $$
DECLARE
  v_current TEXT[];
  v_new TEXT[];
BEGIN
  SELECT image_urls INTO v_current
  FROM public.project_tester_answers
  WHERE project_id = p_project_id
    AND tester_id = p_tester_id
    AND question_id = p_question_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'answer_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  v_new := array_remove(COALESCE(v_current, ARRAY[]::TEXT[]), p_path);

  UPDATE public.project_tester_answers
  SET image_urls = v_new,
      updated_at = now()
  WHERE project_id = p_project_id
    AND tester_id = p_tester_id
    AND question_id = p_question_id;

  RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
