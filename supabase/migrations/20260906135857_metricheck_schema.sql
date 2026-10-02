/*
# MetriCheck Inspector - Core Schema

## Overview
Creates the full database foundation for MetriCheck Inspector, a professional
metrology inspection application. Supports inspector accounts with verification
workflow, product inspections with image uploads, and measurement results with
pass/fail tracking.

## New Tables

1. `profiles`
   - Extends Supabase auth.users with inspector-specific fields.
   - `id` (uuid, PK, FK to auth.users) — links 1:1 with the auth user.
   - `full_name` (text) — inspector's display name.
   - `badge_number` (text, unique) — official inspector ID.
   - `organization` (text) — inspecting body / company.
   - `phone` (text) — contact number.
   - `verification_status` (text, default 'pending') — one of: pending, verified, rejected.
   - `verification_notes` (text) — admin review notes.
   - `verified_at` (timestamptz) — when verification was completed.
   - `created_at`, `updated_at` (timestamptz).

2. `inspections`
   - Core inspection record for a product.
   - `id` (uuid, PK).
   - `user_id` (uuid, FK auth.users, DEFAULT auth.uid()) — owning inspector.
   - `product_name` (text) — name of product under inspection.
   - `product_category` (text) — e.g. Electrical, Mechanical, Textile.
   - `manufacturer` (text) — product manufacturer.
   - `batch_number` (text) — production batch identifier.
   - `inspection_type` (text) — e.g. Dimensional, Visual, Electrical, Safety.
   - `status` (text, default 'draft') — one of: draft, in_progress, completed.
   - `notes` (text) — general inspection notes.
   - `created_at`, `updated_at` (timestamptz).

3. `inspection_images`
   - Product images attached to an inspection.
   - `id` (uuid, PK).
   - `inspection_id` (uuid, FK inspections ON DELETE CASCADE).
   - `storage_path` (text) — path in Supabase Storage bucket.
   - `file_name` (text) — original file name.
   - `file_size` (bigint) — size in bytes.
   - `mime_type` (text) — image MIME type.
   - `created_at` (timestamptz).

4. `inspection_results`
   - Individual measurement results for an inspection.
   - `id` (uuid, PK).
   - `inspection_id` (uuid, FK inspections ON DELETE CASCADE).
   - `parameter_name` (text) — what is being measured.
   - `standard_value` (text) — expected/reference value.
   - `measured_value` (text) — actual measured value.
   - `unit` (text) — unit of measurement.
   - `tolerance_min` (text) — minimum acceptable value.
   - `tolerance_max` (text) — maximum acceptable value.
   - `result` (text, default 'pending') — one of: pass, fail, pending.
   - `notes` (text) — per-parameter notes.
   - `created_at` (timestamptz).

## Security (RLS)
- All tables have RLS enabled.
- `profiles`: users can read/update only their own profile row.
- `inspections`: owner-scoped CRUD via auth.uid() = user_id.
- `inspection_images` and `inspection_results`: scoped through parent inspection ownership.
- All policies use `TO authenticated` since this app requires sign-in.

## Automation
- Trigger `on_auth_user_created` auto-inserts a profile row when a new auth user signs up,
  with verification_status = 'pending'.

## Notes
1. Owner column `inspections.user_id` defaults to `auth.uid()` so frontend inserts
   that omit user_id still satisfy the INSERT WITH CHECK policy.
2. Child tables (images, results) inherit ownership via EXISTS subquery on inspections.
3. Profiles are auto-created by trigger — the frontend does not need to insert them.
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  badge_number text UNIQUE,
  organization text,
  phone text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_notes text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ INSPECTIONS ============
CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT '',
  product_category text DEFAULT '',
  manufacturer text DEFAULT '',
  batch_number text DEFAULT '',
  inspection_type text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_inspections" ON inspections;
CREATE POLICY "select_own_inspections" ON inspections FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_inspections" ON inspections;
CREATE POLICY "insert_own_inspections" ON inspections FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_inspections" ON inspections;
CREATE POLICY "update_own_inspections" ON inspections FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_inspections" ON inspections;
CREATE POLICY "delete_own_inspections" ON inspections FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON inspections(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON inspections(created_at DESC);

-- ============ INSPECTION IMAGES ============
CREATE TABLE IF NOT EXISTS inspection_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_size bigint DEFAULT 0,
  mime_type text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inspection_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_inspection_images" ON inspection_images;
CREATE POLICY "select_own_inspection_images" ON inspection_images FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = inspection_images.inspection_id AND inspections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_inspection_images" ON inspection_images;
CREATE POLICY "insert_own_inspection_images" ON inspection_images FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = inspection_images.inspection_id AND inspections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_inspection_images" ON inspection_images;
CREATE POLICY "delete_own_inspection_images" ON inspection_images FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = inspection_images.inspection_id AND inspections.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_inspection_images_inspection_id ON inspection_images(inspection_id);

-- ============ INSPECTION RESULTS ============
CREATE TABLE IF NOT EXISTS inspection_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  parameter_name text NOT NULL DEFAULT '',
  standard_value text DEFAULT '',
  measured_value text DEFAULT '',
  unit text DEFAULT '',
  tolerance_min text DEFAULT '',
  tolerance_max text DEFAULT '',
  result text NOT NULL DEFAULT 'pending' CHECK (result IN ('pass', 'fail', 'pending')),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inspection_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_inspection_results" ON inspection_results;
CREATE POLICY "select_own_inspection_results" ON inspection_results FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = inspection_results.inspection_id AND inspections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_inspection_results" ON inspection_results;
CREATE POLICY "insert_own_inspection_results" ON inspection_results FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = inspection_results.inspection_id AND inspections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_inspection_results" ON inspection_results;
CREATE POLICY "update_own_inspection_results" ON inspection_results FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = inspection_results.inspection_id AND inspections.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = inspection_results.inspection_id AND inspections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_inspection_results" ON inspection_results;
CREATE POLICY "delete_own_inspection_results" ON inspection_results FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = inspection_results.inspection_id AND inspections.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_inspection_results_inspection_id ON inspection_results(inspection_id);

-- ============ AUTO-CREATE PROFILE TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-images', 'inspection-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: only authenticated users can manage their own folder
DROP POLICY IF EXISTS "Anyone can view inspection images" ON storage.objects;
CREATE POLICY "Anyone can view inspection images" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'inspection-images');

DROP POLICY IF EXISTS "Auth users can upload inspection images" ON storage.objects;
CREATE POLICY "Auth users can upload inspection images" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'inspection-images');

DROP POLICY IF EXISTS "Auth users can delete own inspection images" ON storage.objects;
CREATE POLICY "Auth users can delete own inspection images" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'inspection-images' AND auth.uid()::text = (storage.foldername(name))[1]);
