-- ============================================
-- Auto-activate testers when profile is complete
-- Trigger on UPDATE of public.testers
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_activate_tester()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when status is still 'pending'
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- Required text fields (non-null and non-empty)
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

  -- Required array fields (non-null and at least 1 element)
  IF NEW.tools IS NULL OR array_length(NEW.tools, 1) IS NULL THEN RETURN NEW; END IF;
  IF NEW.browsers IS NULL OR array_length(NEW.browsers, 1) IS NULL THEN RETURN NEW; END IF;
  IF NEW.devices IS NULL OR array_length(NEW.devices, 1) IS NULL THEN RETURN NEW; END IF;
  IF NEW.interests IS NULL OR array_length(NEW.interests, 1) IS NULL THEN RETURN NEW; END IF;

  -- All required fields are filled → activate
  NEW.status := 'active';
  NEW.profile_completed := true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_activate_tester
  BEFORE UPDATE ON public.testers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_activate_tester();

-- ============================================
-- Fix any existing testers stuck in 'pending'
-- with a complete profile
-- ============================================
UPDATE public.testers
SET status = 'active', profile_completed = true
WHERE status = 'pending'
  AND COALESCE(first_name, '') <> ''
  AND COALESCE(last_name, '') <> ''
  AND COALESCE(phone, '') <> ''
  AND COALESCE(job_title, '') <> ''
  AND COALESCE(sector, '') <> ''
  AND COALESCE(company_size, '') <> ''
  AND COALESCE(digital_level, '') <> ''
  AND COALESCE(connection, '') <> ''
  AND COALESCE(availability, '') <> ''
  AND COALESCE(ux_experience, '') <> ''
  AND tools IS NOT NULL AND array_length(tools, 1) IS NOT NULL
  AND browsers IS NOT NULL AND array_length(browsers, 1) IS NOT NULL
  AND devices IS NOT NULL AND array_length(devices, 1) IS NOT NULL
  AND interests IS NOT NULL AND array_length(interests, 1) IS NOT NULL;
