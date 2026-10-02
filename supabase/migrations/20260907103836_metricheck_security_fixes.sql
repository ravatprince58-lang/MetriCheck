-- Revoke EXECUTE from anon on all SECURITY DEFINER functions
-- These should only be callable by authenticated users

REVOKE EXECUTE ON FUNCTION public.complete_inspection(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_verification(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_verification(text, text, text) FROM anon;

-- Also revoke EXECUTE from authenticated on functions that should only be called via RPC with admin checks
-- handle_new_user is a trigger function - revoke from both anon and authenticated (only called by trigger)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
-- is_admin is used internally by RLS policies - revoke from both (called in policy context)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM authenticated;
-- set_user_role is admin-only via RPC but has internal admin check - keep authenticated
-- review_verification has internal admin check - keep authenticated
-- submit_verification has internal auth check - keep authenticated
-- complete_inspection has internal ownership check - keep authenticated

-- Add admin SELECT policy for profiles (admins need to see all inspectors)
DROP POLICY IF EXISTS "select_all_profiles_admin" ON profiles;
CREATE POLICY "select_all_profiles_admin" ON profiles FOR SELECT
  TO authenticated USING (public.is_admin());

-- Add admin SELECT policy for inspections (admins need to see all inspections)
DROP POLICY IF EXISTS "select_all_inspections_admin" ON inspections;
CREATE POLICY "select_all_inspections_admin" ON inspections FOR SELECT
  TO authenticated USING (public.is_admin());

-- Add admin SELECT policy for inspection_images
DROP POLICY IF EXISTS "select_all_inspection_images_admin" ON inspection_images;
CREATE POLICY "select_all_inspection_images_admin" ON inspection_images FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = inspection_images.inspection_id AND public.is_admin())
  );

-- Add admin SELECT policy for inspection_results
DROP POLICY IF EXISTS "select_all_inspection_results_admin" ON inspection_results;
CREATE POLICY "select_all_inspection_results_admin" ON inspection_results FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = inspection_results.inspection_id AND public.is_admin())
  );

-- Add INSERT policy for reports (complete_inspection function needs to insert, but SECURITY DEFINER bypasses RLS)
-- Still add for any direct inserts from authenticated users
DROP POLICY IF EXISTS "insert_own_reports" ON reports;
CREATE POLICY "insert_own_reports" ON reports FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = reports.inspection_id AND inspections.user_id = auth.uid())
  );

-- Add INSERT policy for verification_records (review_verification function inserts via SECURITY DEFINER, but add for completeness)
DROP POLICY IF EXISTS "insert_own_verification_records" ON verification_records;
CREATE POLICY "insert_own_verification_records" ON verification_records FOR INSERT
  TO authenticated WITH CHECK (inspector_id = auth.uid() OR public.is_admin());

-- Add UPDATE policy for profiles (admin can update role/verification via functions, but add explicit policy)
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
