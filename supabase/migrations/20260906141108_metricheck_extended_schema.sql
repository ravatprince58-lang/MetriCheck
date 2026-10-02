/*
# MetriCheck Inspector — Extended Schema: Roles, Admin Access, OCR, Compliance, Reports

## Overview
Extends the core MetriCheck schema with:
1. Inspector/Admin role system stored in `raw_app_meta_data` (user-immutable).
2. New tables: `ocr_results`, `extracted_fields`, `compliance_findings`, `verification_records`, `reports`.
3. Admin users can access ALL inspections across all inspectors.
4. SECURITY DEFINER functions for privileged operations (role assignment, verification review).
5. Column-level privileges so users cannot self-verify or change their role.

## Modified Tables
- `profiles`: adds `role` column (text, default 'inspector', CHECK in 'inspector','admin').
  - Column-level UPDATE grant: users can only update `full_name`, `badge_number`, `organization`, `phone`.
  - `role`, `verification_status`, `verification_notes`, `verified_at` are NOT client-writable.

## New Tables

1. `ocr_results`
   - Stores OCR processing results for an inspection image.
   - `id` (uuid, PK)
   - `image_id` (uuid, FK inspection_images ON DELETE CASCADE)
   - `inspection_id` (uuid, FK inspections ON DELETE CASCADE) — denormalized for easier querying
   - `raw_text` (text) — full extracted text
   - `confidence` (numeric, 0-100) — OCR confidence score
   - `status` (text, default 'pending') — pending, completed, failed
   - `processed_at` (timestamptz)
   - `created_at` (timestamptz)

2. `extracted_fields`
   - Individual fields extracted from an OCR result.
   - `id` (uuid, PK)
   - `ocr_result_id` (uuid, FK ocr_results ON DELETE CASCADE)
   - `field_name` (text) — e.g. "model_number", "manufacturer", "serial_number"
   - `field_value` (text) — extracted value
   - `confidence` (numeric, 0-100)
   - `bounding_box` (jsonb) — coordinates on the image
   - `created_at` (timestamptz)

3. `compliance_findings`
   - Compliance issues found during an inspection.
   - `id` (uuid, PK)
   - `inspection_id` (uuid, FK inspections ON DELETE CASCADE)
   - `rule_name` (text) — the compliance rule being checked
   - `severity` (text, default 'info') — info, warning, critical
   - `status` (text, default 'open') — open, resolved, acknowledged
   - `description` (text) — what was found
   - `recommendation` (text) — suggested action
   - `created_at` (timestamptz)

4. `verification_records`
   - Audit trail of inspector verification submissions and admin reviews.
   - `id` (uuid, PK)
   - `inspector_id` (uuid, FK profiles ON DELETE CASCADE) — the inspector being verified
   - `reviewer_id` (uuid, FK auth.users ON DELETE SET NULL) — admin who reviewed
   - `action` (text) — 'submitted', 'approved', 'rejected', 'requested_info'
   - `previous_status` (text)
   - `new_status` (text)
   - `notes` (text)
   - `created_at` (timestamptz)

5. `reports`
   - Generated inspection reports.
   - `id` (uuid, PK)
   - `inspection_id` (uuid, FK inspections ON DELETE CASCADE, UNIQUE)
   - `report_number` (text, unique) — human-readable report ID
   - `summary` (text)
   - `overall_result` (text) — pass, fail, pending
   - `total_parameters` (integer, default 0)
   - `pass_count` (integer, default 0)
   - `fail_count` (integer, default 0)
   - `generated_at` (timestamptz)
   - `created_at` (timestamptz)

## Security Changes

### Role system
- New profiles.role column, default 'inspector'.
- Role is stored in profiles table (not user-mutable).
- A helper function `is_admin()` checks if the current user has role='admin'.

### Admin access to all inspections
- SELECT policy on inspections: `auth.uid() = user_id OR is_admin()`.
- SELECT on child tables: ownership via parent OR is_admin().
- Admins get read access to all data. Only the owner can INSERT/UPDATE/DELETE.

### Column-level privileges on profiles
- REVOKE full UPDATE from authenticated.
- GRANT UPDATE only on (full_name, badge_number, organization, phone).
- role, verification_status, verification_notes, verified_at are NOT client-writable.

### SECURITY DEFINER functions
1. `submit_verification(badge, org, phone)` — inspector submits verification request.
   - Updates editable fields + sets verification_status='pending'.
   - Inserts a verification_records row with action='submitted'.
2. `review_verification(target_id, action, notes)` — admin approves/rejects.
   - Checks caller is_admin().
   - Updates target profile's verification_status + verified_at + verification_notes.
   - Inserts a verification_records audit row.
3. `set_user_role(target_id, new_role)` — admin changes a user's role.
   - Checks caller is_admin().
4. `complete_inspection(inspection_id)` — marks inspection complete and generates report.
   - Computes pass/fail counts from inspection_results.
   - Inserts a reports row with computed summary.
   - Updates inspection status to 'completed'.

## Important Notes
1. The role is in `profiles.role`, NOT in `raw_user_meta_data` (which is user-mutable).
2. All new tables have RLS enabled with ownership via parent inspection.
3. Admin users can SELECT all inspections but cannot mutate another user's data.
4. verification_records are readable by the inspector themselves and all admins.
5. The `complete_inspection` function is the ONLY way to generate a report — the frontend
   cannot insert into `reports` directly (no INSERT policy on reports table).
*/

-- ============ ADD ROLE COLUMN TO PROFILES ============
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'inspector'
      CHECK (role IN ('inspector', 'admin'));
  END IF;
END $$;

-- ============ HELPER FUNCTION: is_admin ============
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============ NEW TABLES ============

-- OCR Results
CREATE TABLE IF NOT EXISTS ocr_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id uuid NOT NULL REFERENCES inspection_images(id) ON DELETE CASCADE,
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  raw_text text DEFAULT '',
  confidence numeric DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ocr_results_inspection_id ON ocr_results(inspection_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_image_id ON ocr_results(image_id);

-- Extracted Fields
CREATE TABLE IF NOT EXISTS extracted_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocr_result_id uuid NOT NULL REFERENCES ocr_results(id) ON DELETE CASCADE,
  field_name text NOT NULL DEFAULT '',
  field_value text DEFAULT '',
  confidence numeric DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  bounding_box jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE extracted_fields ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_extracted_fields_ocr_result_id ON extracted_fields(ocr_result_id);

-- Compliance Findings
CREATE TABLE IF NOT EXISTS compliance_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  rule_name text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'acknowledged')),
  description text DEFAULT '',
  recommendation text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE compliance_findings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_compliance_findings_inspection_id ON compliance_findings(inspection_id);

-- Verification Records
CREATE TABLE IF NOT EXISTS verification_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL DEFAULT 'submitted' CHECK (action IN ('submitted', 'approved', 'rejected', 'requested_info')),
  previous_status text,
  new_status text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE verification_records ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_verification_records_inspector_id ON verification_records(inspector_id);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL UNIQUE REFERENCES inspections(id) ON DELETE CASCADE,
  report_number text NOT NULL DEFAULT '',
  summary text DEFAULT '',
  overall_result text NOT NULL DEFAULT 'pending' CHECK (overall_result IN ('pass', 'fail', 'pending')),
  total_parameters integer NOT NULL DEFAULT 0,
  pass_count integer NOT NULL DEFAULT 0,
  fail_count integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reports_inspection_id ON reports(inspection_id);

-- ============ RLS POLICIES FOR NEW TABLES ============

-- OCR Results: owner via parent inspection OR admin
DROP POLICY IF EXISTS "select_own_or_admin_ocr_results" ON ocr_results;
CREATE POLICY "select_own_or_admin_ocr_results" ON ocr_results FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = ocr_results.inspection_id AND (inspections.user_id = auth.uid() OR public.is_admin()))
  );

DROP POLICY IF EXISTS "insert_own_ocr_results" ON ocr_results;
CREATE POLICY "insert_own_ocr_results" ON ocr_results FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = ocr_results.inspection_id AND inspections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_ocr_results" ON ocr_results;
CREATE POLICY "update_own_ocr_results" ON ocr_results FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = ocr_results.inspection_id AND inspections.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = ocr_results.inspection_id AND inspections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_ocr_results" ON ocr_results;
CREATE POLICY "delete_own_ocr_results" ON ocr_results FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = ocr_results.inspection_id AND inspections.user_id = auth.uid())
  );

-- Extracted Fields: owner via parent chain OR admin
DROP POLICY IF EXISTS "select_own_or_admin_extracted_fields" ON extracted_fields;
CREATE POLICY "select_own_or_admin_extracted_fields" ON extracted_fields FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM ocr_results
      JOIN inspections ON inspections.id = ocr_results.inspection_id
      WHERE ocr_results.id = extracted_fields.ocr_result_id
      AND (inspections.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "insert_own_extracted_fields" ON extracted_fields;
CREATE POLICY "insert_own_extracted_fields" ON extracted_fields FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM ocr_results
      JOIN inspections ON inspections.id = ocr_results.inspection_id
      WHERE ocr_results.id = extracted_fields.ocr_result_id
      AND inspections.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_extracted_fields" ON extracted_fields;
CREATE POLICY "update_own_extracted_fields" ON extracted_fields FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM ocr_results
      JOIN inspections ON inspections.id = ocr_results.inspection_id
      WHERE ocr_results.id = extracted_fields.ocr_result_id
      AND inspections.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM ocr_results
      JOIN inspections ON inspections.id = ocr_results.inspection_id
      WHERE ocr_results.id = extracted_fields.ocr_result_id
      AND inspections.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_extracted_fields" ON extracted_fields;
CREATE POLICY "delete_own_extracted_fields" ON extracted_fields FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM ocr_results
      JOIN inspections ON inspections.id = ocr_results.inspection_id
      WHERE ocr_results.id = extracted_fields.ocr_result_id
      AND inspections.user_id = auth.uid()
    )
  );

-- Compliance Findings: owner via parent OR admin
DROP POLICY IF EXISTS "select_own_or_admin_compliance_findings" ON compliance_findings;
CREATE POLICY "select_own_or_admin_compliance_findings" ON compliance_findings FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = compliance_findings.inspection_id AND (inspections.user_id = auth.uid() OR public.is_admin()))
  );

DROP POLICY IF EXISTS "insert_own_compliance_findings" ON compliance_findings;
CREATE POLICY "insert_own_compliance_findings" ON compliance_findings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = compliance_findings.inspection_id AND inspections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_compliance_findings" ON compliance_findings;
CREATE POLICY "update_own_compliance_findings" ON compliance_findings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = compliance_findings.inspection_id AND inspections.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = compliance_findings.inspection_id AND inspections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_compliance_findings" ON compliance_findings;
CREATE POLICY "delete_own_compliance_findings" ON compliance_findings FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = compliance_findings.inspection_id AND inspections.user_id = auth.uid())
  );

-- Verification Records: inspector can read their own, admin can read all
DROP POLICY IF EXISTS "select_own_or_admin_verification_records" ON verification_records;
CREATE POLICY "select_own_or_admin_verification_records" ON verification_records FOR SELECT
  TO authenticated USING (inspector_id = auth.uid() OR public.is_admin());

-- Reports: owner via parent OR admin (no INSERT policy — only via complete_inspection RPC)
DROP POLICY IF EXISTS "select_own_or_admin_reports" ON reports;
CREATE POLICY "select_own_or_admin_reports" ON reports FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = reports.inspection_id AND (inspections.user_id = auth.uid() OR public.is_admin()))
  );

-- ============ UPDATE EXISTING INSPECTIONS SELECT POLICY FOR ADMIN ACCESS ============
DROP POLICY IF EXISTS "select_own_inspections" ON inspections;
CREATE POLICY "select_own_inspections" ON inspections FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- ============ UPDATE EXISTING CHILD TABLE SELECT POLICIES FOR ADMIN ACCESS ============
DROP POLICY IF EXISTS "select_own_inspection_images" ON inspection_images;
CREATE POLICY "select_own_inspection_images" ON inspection_images FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = inspection_images.inspection_id AND (inspections.user_id = auth.uid() OR public.is_admin()))
  );

DROP POLICY IF EXISTS "select_own_inspection_results" ON inspection_results;
CREATE POLICY "select_own_inspection_results" ON inspection_results FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = inspection_results.inspection_id AND (inspections.user_id = auth.uid() OR public.is_admin()))
  );

-- ============ COLUMN-LEVEL PRIVILEGES ON PROFILES ============
-- Users can only update their display fields, NOT role/verification columns
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, badge_number, organization, phone) ON profiles TO authenticated;

-- ============ SECURITY DEFINER FUNCTIONS ============

-- submit_verification: inspector submits their credentials for admin review
CREATE OR REPLACE FUNCTION public.submit_verification(
  p_badge_number text,
  p_organization text,
  p_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prev_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT verification_status INTO v_prev_status FROM public.profiles WHERE id = auth.uid();

  UPDATE public.profiles
  SET badge_number = p_badge_number,
      organization = p_organization,
      phone = p_phone,
      verification_status = 'pending',
      verification_notes = NULL,
      verified_at = NULL,
      updated_at = now()
  WHERE id = auth.uid();

  INSERT INTO public.verification_records (inspector_id, action, previous_status, new_status)
  VALUES (auth.uid(), 'submitted', v_prev_status, 'pending');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_verification(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_verification(text, text, text) TO authenticated;

-- review_verification: admin approves or rejects an inspector's verification
CREATE OR REPLACE FUNCTION public.review_verification(
  p_inspector_id uuid,
  p_action text,
  p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prev_status text;
  v_new_status text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized: admin access required';
  END IF;

  IF p_action NOT IN ('approved', 'rejected', 'requested_info') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT verification_status INTO v_prev_status FROM public.profiles WHERE id = p_inspector_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inspector not found';
  END IF;

  v_new_status := CASE p_action
    WHEN 'approved' THEN 'verified'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'requested_info' THEN 'pending'
  END;

  UPDATE public.profiles
  SET verification_status = v_new_status,
      verification_notes = p_notes,
      verified_at = CASE WHEN p_action = 'approved' THEN now() ELSE verified_at END,
      updated_at = now()
  WHERE id = p_inspector_id;

  INSERT INTO public.verification_records (inspector_id, reviewer_id, action, previous_status, new_status, notes)
  VALUES (p_inspector_id, auth.uid(), p_action, v_prev_status, v_new_status, p_notes);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_verification(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_verification(uuid, text, text) TO authenticated;

-- set_user_role: admin promotes/demotes a user
CREATE OR REPLACE FUNCTION public.set_user_role(
  p_target_id uuid,
  p_new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized: admin access required';
  END IF;

  IF p_new_role NOT IN ('inspector', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE public.profiles SET role = p_new_role, updated_at = now() WHERE id = p_target_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;

-- complete_inspection: marks inspection complete and generates a report with computed stats
CREATE OR REPLACE FUNCTION public.complete_inspection(
  p_inspection_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_pass integer;
  v_fail integer;
  v_overall text;
  v_report_id uuid;
  v_report_number text;
  v_count integer;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = p_inspection_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized or inspection not found';
  END IF;

  SELECT count(*), 
         count(*) FILTER (WHERE result = 'pass'),
         count(*) FILTER (WHERE result = 'fail')
  INTO v_total, v_pass, v_fail
  FROM public.inspection_results
  WHERE inspection_id = p_inspection_id;

  v_overall := CASE
    WHEN v_fail > 0 THEN 'fail'
    WHEN v_total = 0 OR v_total > (v_pass + v_fail) THEN 'pending'
    ELSE 'pass'
  END;

  -- Generate report number
  v_count := 0;
  SELECT count(*) INTO v_count FROM public.reports;
  v_report_number := 'RPT-' || to_char(now(), 'YYYY') || '-' || lpad((v_count + 1)::text, 5, '0');

  -- Upsert report (replace if exists)
  INSERT INTO public.reports (inspection_id, report_number, summary, overall_result, total_parameters, pass_count, fail_count, generated_at)
  VALUES (
    p_inspection_id,
    v_report_number,
    'Inspection of ' || COALESCE((SELECT product_name FROM public.inspections WHERE id = p_inspection_id), 'product') ||
    ' — ' || v_pass || ' passed, ' || v_fail || ' failed out of ' || v_total || ' parameters.',
    v_overall,
    v_total,
    v_pass,
    v_fail,
    now()
  )
  ON CONFLICT (inspection_id) DO UPDATE
  SET report_number = EXCLUDED.report_number,
      summary = EXCLUDED.summary,
      overall_result = EXCLUDED.overall_result,
      total_parameters = EXCLUDED.total_parameters,
      pass_count = EXCLUDED.pass_count,
      fail_count = EXCLUDED.fail_count,
      generated_at = now()
  RETURNING id INTO v_report_id;

  -- Update inspection status
  UPDATE public.inspections SET status = 'completed', updated_at = now() WHERE id = p_inspection_id;

  RETURN v_report_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_inspection(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_inspection(uuid) TO authenticated;

-- ============ UPDATE AUTO-CREATE PROFILE TRIGGER ============
-- Ensure new users get role='inspector'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'inspector')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
