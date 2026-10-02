-- Merge fix: persist manual OCR corrections on each inspection.
-- This avoids duplicate manual-field rows for the same inspection/field.
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS manual_details jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill legacy manual_fields into the JSONB column when that table exists.
DO $$
BEGIN
  IF to_regclass('public.manual_fields') IS NOT NULL THEN
    UPDATE public.inspections i
    SET manual_details = COALESCE((
      SELECT jsonb_object_agg(m.field_name, m.field_value)
      FROM public.manual_fields m
      WHERE m.inspection_id = i.id
    ), '{}'::jsonb)
    WHERE EXISTS (
      SELECT 1 FROM public.manual_fields m WHERE m.inspection_id = i.id
    );
  END IF;
END $$;
