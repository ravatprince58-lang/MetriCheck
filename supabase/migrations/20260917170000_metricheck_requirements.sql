-- MetriCheck requirement fixes: manual fields, public demo/grievance intake,
-- verification-history deletion, safer admin helper, and stronger completion report.

CREATE TABLE IF NOT EXISTS public.manual_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_value text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inspection_id, field_name)
);
ALTER TABLE public.manual_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manual_fields_owner_select" ON public.manual_fields;
CREATE POLICY "manual_fields_owner_select" ON public.manual_fields FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id=inspection_id AND (i.user_id=auth.uid() OR public.is_admin())));
DROP POLICY IF EXISTS "manual_fields_owner_insert" ON public.manual_fields;
CREATE POLICY "manual_fields_owner_insert" ON public.manual_fields FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id=inspection_id AND i.user_id=auth.uid()));
DROP POLICY IF EXISTS "manual_fields_owner_update" ON public.manual_fields;
CREATE POLICY "manual_fields_owner_update" ON public.manual_fields FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id=inspection_id AND i.user_id=auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id=inspection_id AND i.user_id=auth.uid()));
DROP POLICY IF EXISTS "manual_fields_owner_delete" ON public.manual_fields;
CREATE POLICY "manual_fields_owner_delete" ON public.manual_fields FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id=inspection_id AND i.user_id=auth.uid()));

CREATE TABLE IF NOT EXISTS public.demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL,
  organization text NOT NULL, phone text DEFAULT '', message text DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "demo_requests_public_insert" ON public.demo_requests;
CREATE POLICY "demo_requests_public_insert" ON public.demo_requests FOR INSERT TO anon, authenticated WITH CHECK (length(trim(name)) > 0 AND length(trim(email)) > 3 AND length(trim(organization)) > 0);
DROP POLICY IF EXISTS "demo_requests_admin_read" ON public.demo_requests;
CREATE POLICY "demo_requests_admin_read" ON public.demo_requests FOR SELECT TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.consumer_grievances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL,
  product_name text NOT NULL, category text DEFAULT '', complaint text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','in_review','resolved','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consumer_grievances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grievances_public_insert" ON public.consumer_grievances;
CREATE POLICY "grievances_public_insert" ON public.consumer_grievances FOR INSERT TO anon, authenticated WITH CHECK (length(trim(name)) > 0 AND length(trim(email)) > 3 AND length(trim(product_name)) > 0 AND length(trim(complaint)) > 0);
DROP POLICY IF EXISTS "grievances_admin_read" ON public.consumer_grievances;
CREATE POLICY "grievances_admin_read" ON public.consumer_grievances FOR SELECT TO authenticated USING (public.is_admin());

-- The helper is intentionally callable by authenticated users because RLS uses it.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "delete_own_verification_records" ON public.verification_records;
CREATE POLICY "delete_own_verification_records" ON public.verification_records FOR DELETE TO authenticated USING (inspector_id = auth.uid());

-- Prevent completed inspections from being changed through the normal client RLS path.
DROP POLICY IF EXISTS "update_own_inspections" ON public.inspections;
CREATE POLICY "update_own_inspections" ON public.inspections FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status <> 'completed')
WITH CHECK (auth.uid() = user_id AND status <> 'completed');

-- Rebuild completion so the actual compliance workflow determines the final result.
CREATE OR REPLACE FUNCTION public.complete_inspection(p_inspection_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total integer; v_pass integer; v_fail integer; v_pending integer; v_overall text; v_report_id uuid; v_report_number text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.inspections WHERE id=p_inspection_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Not authorized or inspection not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.compliance_checks WHERE inspection_id=p_inspection_id AND verified_status IS NULL) THEN RAISE EXCEPTION 'All compliance checks must be verified before completion'; END IF;
  SELECT count(*), count(*) FILTER (WHERE COALESCE(verified_status, auto_status)='COMPLIANT'), count(*) FILTER (WHERE COALESCE(verified_status, auto_status)='NON_COMPLIANT'), count(*) FILTER (WHERE COALESCE(verified_status, auto_status) IN ('NOT_DETECTED','NEEDS_REVIEW','MISSING')) INTO v_total,v_pass,v_fail,v_pending FROM public.compliance_checks WHERE inspection_id=p_inspection_id;
  v_overall := CASE WHEN v_fail > 0 THEN 'fail' WHEN v_total=0 OR v_pending>0 THEN 'pending' ELSE 'pass' END;
  v_report_number := 'RPT-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.reports (inspection_id,report_number,summary,overall_result,total_parameters,pass_count,fail_count,generated_at)
  VALUES (p_inspection_id,v_report_number,
    'Final inspection statement: ' || CASE v_overall WHEN 'pass' THEN 'The inspected packaged commodity complies with the applicable requirements reviewed in this inspection.' WHEN 'fail' THEN 'The inspected packaged commodity does not comply with one or more applicable requirements identified in this inspection.' ELSE 'The inspection was completed, but one or more requirements require further review.' END,
    v_overall,v_total,v_pass,v_fail,now())
  ON CONFLICT (inspection_id) DO UPDATE SET report_number=EXCLUDED.report_number,summary=EXCLUDED.summary,overall_result=EXCLUDED.overall_result,total_parameters=EXCLUDED.total_parameters,pass_count=EXCLUDED.pass_count,fail_count=EXCLUDED.fail_count,generated_at=now()
  RETURNING id INTO v_report_id;
  UPDATE public.inspections SET status='completed',updated_at=now() WHERE id=p_inspection_id AND status <> 'completed';
  RETURN v_report_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.complete_inspection(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_inspection(uuid) TO authenticated;

-- Reliable public demo submission: use a tightly-scoped SECURITY DEFINER RPC
-- so the public form does not depend on direct table INSERT privileges.
CREATE OR REPLACE FUNCTION public.submit_demo_request(
  p_name text,
  p_email text,
  p_organization text,
  p_phone text DEFAULT '',
  p_message text DEFAULT ''
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
     OR length(trim(coalesce(p_organization, ''))) = 0 THEN
    RAISE EXCEPTION 'Please provide a valid name, email, and organization';
  END IF;

  INSERT INTO public.demo_requests (name, email, organization, phone, message)
  VALUES (
    trim(p_name),
    lower(trim(p_email)),
    trim(p_organization),
    trim(coalesce(p_phone, '')),
    trim(coalesce(p_message, ''))
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_demo_request(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_demo_request(text, text, text, text, text) TO anon, authenticated;

-- Verification history deletion through ownership-checked SECURITY DEFINER RPCs.
-- This makes deletion deterministic even if direct table DELETE grants/policies differ
-- between an existing Supabase project and a fresh migration.
CREATE OR REPLACE FUNCTION public.delete_verification_history_record(p_record_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.verification_records
  WHERE id = p_record_id
    AND inspector_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_my_verification_history()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.verification_records
  WHERE inspector_id = auth.uid();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_verification_history_record(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_verification_history() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_verification_history_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_verification_history() TO authenticated;
