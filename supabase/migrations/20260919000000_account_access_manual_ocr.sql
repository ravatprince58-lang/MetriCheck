-- Account/access controls and persistent manual OCR corrections.
-- Assumption: existing profiles.badge_number is the Inspector ID.
-- Passwords are NEVER stored in access_requests. The request form uses the
-- password only with Supabase Auth signUp; access approval is enforced by RLS/RPC.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'inspector'
    CHECK (account_type IN ('inspector','demo')),
  ADD COLUMN IF NOT EXISTS access_status text NOT NULL DEFAULT 'pending'
    CHECK (access_status IN ('pending','approved','rejected','suspended')),
  ADD COLUMN IF NOT EXISTS access_notes text;

-- Preserve existing verified inspectors; everyone else starts pending.
UPDATE public.profiles
SET access_status = CASE
  WHEN role = 'admin' OR verification_status = 'verified' THEN 'approved'
  WHEN verification_status = 'rejected' THEN 'rejected'
  ELSE 'pending'
END
WHERE access_status = 'pending';

CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  organization text NOT NULL,
  phone text DEFAULT '',
  product_name text NOT NULL DEFAULT '',
  brand_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON public.access_requests(lower(email));
CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON public.access_requests(requested_user_id);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "access_requests_public_insert" ON public.access_requests;
CREATE POLICY "access_requests_public_insert" ON public.access_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(name)) > 0 AND
    length(trim(email)) >= 4 AND
    position('@' IN trim(email)) > 0 AND
    length(trim(organization)) > 0 AND
    length(trim(product_name)) > 0 AND
    length(trim(brand_name)) > 0 AND
    requested_user_id IS NULL
  );
DROP POLICY IF EXISTS "access_requests_admin_select" ON public.access_requests;
CREATE POLICY "access_requests_admin_select" ON public.access_requests
  FOR SELECT TO authenticated USING (public.is_admin());

-- Link a public request to the authenticated account without exposing or
-- storing passwords. This also handles email-confirmation-enabled projects.
CREATE OR REPLACE FUNCTION public.claim_access_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.access_requests
  SET requested_user_id = auth.uid(), updated_at = now()
  WHERE requested_user_id IS NULL
    AND lower(email) = lower(coalesce(auth.jwt()->>'email',''))
    AND status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_access_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_access_requests() TO authenticated;

CREATE OR REPLACE FUNCTION public.review_access_request(
  p_request_id uuid,
  p_action text,
  p_notes text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_request public.access_requests%ROWTYPE;
  v_user_id uuid;
  v_new_status text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized: admin access required'; END IF;
  IF p_action NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid action'; END IF;

  SELECT * INTO v_request FROM public.access_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Access request not found'; END IF;

  v_user_id := v_request.requested_user_id;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_request.email) LIMIT 1;
  END IF;

  IF p_action = 'approved' AND v_user_id IS NULL THEN
    RAISE EXCEPTION 'The requester must create/sign in to a Supabase Auth account before approval';
  END IF;

  v_new_status := p_action;
  UPDATE public.access_requests
  SET status = v_new_status,
      requested_user_id = COALESCE(requested_user_id, v_user_id),
      review_notes = NULLIF(trim(coalesce(p_notes,'')),''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET account_type = 'demo',
        access_status = CASE WHEN p_action = 'approved' THEN 'approved' ELSE 'rejected' END,
        access_notes = NULLIF(trim(coalesce(p_notes,'')),''),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN p_action = 'approved' THEN 'access_request_approved' ELSE 'access_request_rejected' END,
    'access_request',
    p_request_id,
    jsonb_build_object('requester_user_id', v_user_id, 'email', v_request.email, 'notes', p_notes)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.review_access_request(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_access_request(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_inspection_access(
  p_target_user_id uuid,
  p_access_status text,
  p_notes text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized: admin access required'; END IF;
  IF p_target_user_id = auth.uid() THEN RAISE EXCEPTION 'Administrators cannot revoke their own access'; END IF;
  IF p_access_status NOT IN ('approved','rejected','suspended','pending') THEN RAISE EXCEPTION 'Invalid access status'; END IF;

  UPDATE public.profiles
  SET access_status = p_access_status,
      access_notes = NULLIF(trim(coalesce(p_notes,'')),''),
      updated_at = now()
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'inspection_access_changed',
    'profile',
    p_target_user_id,
    jsonb_build_object('access_status', p_access_status, 'notes', p_notes)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.set_inspection_access(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_inspection_access(uuid,text,text) TO authenticated;

-- Keep legacy inspector verification and new access control in sync.
CREATE OR REPLACE FUNCTION public.review_verification(
  p_inspector_id uuid,
  p_action text,
  p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_prev_status text;
DECLARE v_new_status text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized: admin access required'; END IF;
  IF p_action NOT IN ('approved','rejected','requested_info') THEN RAISE EXCEPTION 'Invalid action'; END IF;

  SELECT verification_status INTO v_prev_status FROM public.profiles WHERE id = p_inspector_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inspector not found'; END IF;

  v_new_status := CASE p_action WHEN 'approved' THEN 'verified' WHEN 'rejected' THEN 'rejected' ELSE 'pending' END;

  UPDATE public.profiles
  SET verification_status = v_new_status,
      verification_notes = p_notes,
      access_status = CASE
        WHEN p_action = 'approved' THEN 'approved'
        WHEN p_action = 'rejected' THEN 'rejected'
        ELSE 'pending'
      END,
      verified_at = CASE WHEN p_action = 'approved' THEN now() ELSE verified_at END,
      updated_at = now()
  WHERE id = p_inspector_id;

  INSERT INTO public.verification_records (inspector_id, reviewer_id, action, previous_status, new_status, notes)
  VALUES (p_inspector_id, auth.uid(), p_action, v_prev_status, v_new_status, p_notes);

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'verification_reviewed', 'profile', p_inspector_id,
          jsonb_build_object('decision', p_action, 'notes', p_notes));
END;
$$;
REVOKE ALL ON FUNCTION public.review_verification(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_verification(uuid,text,text) TO authenticated;

-- Ensure the auth trigger preserves account type from signUp metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, account_type, access_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'inspector',
    CASE WHEN NEW.raw_user_meta_data->>'account_type' = 'demo' THEN 'demo' ELSE 'inspector' END,
    'pending'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name,''), profiles.full_name),
    account_type = EXCLUDED.account_type,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Make the existing manual field table explicitly safe for admin reads and
-- add source metadata without replacing the current data model.
ALTER TABLE public.manual_fields
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','ocr_correction')),
  ADD COLUMN IF NOT EXISTS corrected_from text;

DROP POLICY IF EXISTS "manual_fields_owner_select" ON public.manual_fields;
CREATE POLICY "manual_fields_owner_select" ON public.manual_fields FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id=inspection_id AND (i.user_id=auth.uid() OR public.is_admin())));

-- Existing manual_fields INSERT/UPDATE/DELETE policies already restrict writes
-- to the inspection owner. Keep them; no service-role or second auth system.
