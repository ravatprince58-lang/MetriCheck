-- Reliable public grievance submission without exposing grievance rows to anonymous users.
-- The public form may insert through this tightly-scoped SECURITY DEFINER function,
-- while normal SELECT remains restricted to administrators.
CREATE OR REPLACE FUNCTION public.submit_consumer_grievance(
  p_name text,
  p_email text,
  p_product_name text,
  p_category text DEFAULT '',
  p_complaint text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF length(trim(coalesce(p_name, ''))) = 0
     OR length(trim(coalesce(p_email, ''))) < 4
     OR position('@' IN trim(p_email)) = 0
     OR length(trim(coalesce(p_product_name, ''))) = 0
     OR length(trim(coalesce(p_complaint, ''))) = 0 THEN
    RAISE EXCEPTION 'Please provide valid name, email, product name, and complaint details';
  END IF;

  INSERT INTO public.consumer_grievances (name, email, product_name, category, complaint)
  VALUES (
    trim(p_name),
    lower(trim(p_email)),
    trim(p_product_name),
    trim(coalesce(p_category, '')),
    trim(p_complaint)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_consumer_grievance(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_consumer_grievance(text, text, text, text, text) TO anon, authenticated;
