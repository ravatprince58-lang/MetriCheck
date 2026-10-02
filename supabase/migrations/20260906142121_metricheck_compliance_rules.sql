/*
# MetriCheck Inspector — Legal Metrology Compliance Rules Engine

## Overview
Creates a database-driven compliance rules engine for packaged-commodity inspections
under the Legal Metrology Act (India). The system loads applicable rules based on
product category, checks declarations detected from OCR, and stores inspector-verified
compliance findings.

## New Tables

1. `compliance_rules`
   - The rules library — each row is a real Legal Metrology / packaged-commodity requirement.
   - `id` (uuid, PK)
   - `rule_code` (text, unique) — e.g. "LM-001", "PCR-003"
   - `rule_name` (text) — short name of the rule
   - `description` (text) — what the rule requires
   - `legal_reference` (text) — the act/regulation section
   - `product_categories` (text[]) — categories this rule applies to; empty array = all categories
   - `required_fields` (text[]) — OCR field names this rule checks (e.g. ['mrp', 'net_quantity'])
   - `severity` (text) — 'mandatory', 'recommended'
   - `is_active` (boolean, default true)
   - `created_at`, `updated_at` (timestamptz)

2. `compliance_checks`
   - Per-inspection, per-rule compliance evaluation results with inspector verification.
   - `id` (uuid, PK)
   - `inspection_id` (uuid, FK inspections ON DELETE CASCADE)
   - `rule_id` (uuid, FK compliance_rules ON DELETE CASCADE)
   - `detected_values` (jsonb) — the OCR values used for this check (snapshot)
   - `auto_status` (text) — system-computed status: COMPLIANT, NON_COMPLIANT, NOT_DETECTED, MISSING, NOT_APPLICABLE, NEEDS_REVIEW
   - `verified_status` (text) — inspector's final status (nullable until verified)
   - `inspector_notes` (text) — inspector's notes
   - `evidence_image_id` (uuid, FK inspection_images, nullable) — which image provides evidence
   - `verified_by` (uuid, FK auth.users, nullable) — who verified
   - `verified_at` (timestamptz, nullable)
   - `created_at`, `updated_at` (timestamptz)

## Seeded Rules
Real Legal Metrology Act / Packaged Commodities Rules requirements:
- LM-001: Name and address of manufacturer/packer
- LM-002: Common or generic name of the commodity
- LM-003: Net quantity in terms of standard unit
- LM-004: Month and year of manufacture/packing
- LM-005: Maximum Retail Price (MRP)
- LM-006: Batch/lot number or code
- LM-007: Country of origin for imported goods
- LM-008: Best before / Use by date
- LM-009: Consumer care contact details
- PCR-010: FSSAI license number (Food category only)
- PCR-011: List of ingredients (Food category only)
- PCR-012: Nutritional information (Food category only)
- PCR-013: Vegetarian/non-vegetarian symbol (Food category only)
- LM-014: Barcode/EAN for identification
- LM-015: Brand name or trade name

## Security
- `compliance_rules`: readable by all authenticated users (rules library is shared).
  Only admins can INSERT/UPDATE/DELETE rules.
- `compliance_checks`: owner-scoped via parent inspection (same pattern as other child tables).
  Admins can SELECT all checks.

## Important Notes
1. Rules are seeded with real Legal Metrology requirements — not invented rules.
2. "NOT_DETECTED" is a valid auto_status — it does NOT mean "NON_COMPLIANT".
   The inspector reviews and sets the final verified_status.
3. `verified_status` is nullable — it is only set when the inspector makes a decision.
4. The `detected_values` jsonb stores a snapshot of the OCR values at check time,
   so the compliance record is preserved even if OCR results change later.
5. `evidence_image_id` links to the specific image that provides evidence for the check.
*/

-- ============ COMPLIANCE RULES TABLE ============
CREATE TABLE IF NOT EXISTS compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code text NOT NULL UNIQUE,
  rule_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  legal_reference text NOT NULL DEFAULT '',
  product_categories text[] NOT NULL DEFAULT '{}',
  required_fields text[] NOT NULL DEFAULT '{}',
  severity text NOT NULL DEFAULT 'mandatory' CHECK (severity IN ('mandatory', 'recommended')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;

-- Rules are a shared library: all authenticated users can read
DROP POLICY IF EXISTS "select_all_compliance_rules" ON compliance_rules;
CREATE POLICY "select_all_compliance_rules" ON compliance_rules FOR SELECT
  TO authenticated USING (true);

-- Only admins can modify rules
DROP POLICY IF EXISTS "insert_admin_compliance_rules" ON compliance_rules;
CREATE POLICY "insert_admin_compliance_rules" ON compliance_rules FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_admin_compliance_rules" ON compliance_rules;
CREATE POLICY "update_admin_compliance_rules" ON compliance_rules FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_admin_compliance_rules" ON compliance_rules;
CREATE POLICY "delete_admin_compliance_rules" ON compliance_rules FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============ COMPLIANCE CHECKS TABLE ============
CREATE TABLE IF NOT EXISTS compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES compliance_rules(id) ON DELETE CASCADE,
  detected_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_status text NOT NULL DEFAULT 'NEEDS_REVIEW' CHECK (auto_status IN ('COMPLIANT', 'NON_COMPLIANT', 'NOT_DETECTED', 'MISSING', 'NOT_APPLICABLE', 'NEEDS_REVIEW')),
  verified_status text CHECK (verified_status IS NULL OR verified_status IN ('COMPLIANT', 'NON_COMPLIANT', 'NOT_DETECTED', 'MISSING', 'NOT_APPLICABLE', 'NEEDS_REVIEW')),
  inspector_notes text DEFAULT '',
  evidence_image_id uuid REFERENCES inspection_images(id) ON DELETE SET NULL,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(inspection_id, rule_id)
);

ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;

-- Owner via parent inspection OR admin
DROP POLICY IF EXISTS "select_own_or_admin_compliance_checks" ON compliance_checks;
CREATE POLICY "select_own_or_admin_compliance_checks" ON compliance_checks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = compliance_checks.inspection_id AND (inspections.user_id = auth.uid() OR public.is_admin()))
  );

DROP POLICY IF EXISTS "insert_own_compliance_checks" ON compliance_checks;
CREATE POLICY "insert_own_compliance_checks" ON compliance_checks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = compliance_checks.inspection_id AND inspections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_compliance_checks" ON compliance_checks;
CREATE POLICY "update_own_compliance_checks" ON compliance_checks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = compliance_checks.inspection_id AND inspections.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = compliance_checks.inspection_id AND inspections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_compliance_checks" ON compliance_checks;
CREATE POLICY "delete_own_compliance_checks" ON compliance_checks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM inspections WHERE inspections.id = compliance_checks.inspection_id AND inspections.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_compliance_checks_inspection_id ON compliance_checks(inspection_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_rule_id ON compliance_checks(rule_id);

-- ============ SEED REAL LEGAL METROLOGY RULES ============
-- Legal Metrology Act, 2009 and Packaged Commodities Rules, 2011 (India)

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'LM-001',
  'Name and Address of Manufacturer/Packer',
  'The package shall bear the name and complete address of the manufacturer, packer, or importer of the commodity.',
  'Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6(1)(a)',
  '{}',
  '{"manufacturer", "address"}',
  'mandatory'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'LM-002',
  'Common or Generic Name of Commodity',
  'The package shall show the common or generic name of the commodity contained in the package.',
  'Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6(1)(b)',
  '{}',
  '{"product_name"}',
  'mandatory'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'LM-003',
  'Net Quantity in Standard Unit',
  'The net quantity in terms of standard unit of weight or measure must be declared on the package.',
  'Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6(1)(c)',
  '{}',
  '{"net_quantity"}',
  'mandatory'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'LM-004',
  'Month and Year of Manufacture/Packing',
  'The month and year in which the commodity was manufactured or pre-packed shall be mentioned on the package.',
  'Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6(1)(d)',
  '{}',
  '{"manufacturing_date"}',
  'mandatory'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'LM-005',
  'Maximum Retail Price (MRP)',
  'The maximum retail price at which the commodity shall be sold must be printed on the package, inclusive of all taxes.',
  'Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6(1)(e)',
  '{}',
  '{"mrp"}',
  'mandatory'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'LM-006',
  'Batch or Lot Number',
  'The batch, lot, or code number of the manufactured or pre-packed commodity shall be mentioned on the package.',
  'Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6(1)(f)',
  '{}',
  '{"batch_number"}',
  'mandatory'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'LM-007',
  'Country of Origin',
  'For imported packages, the country of origin must be declared on the package.',
  'Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6(1)(g)',
  '{}',
  '{"country_of_origin"}',
  'mandatory'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'LM-008',
  'Best Before / Use By Date',
  'The best before or use by date shall be mentioned where the commodity has a limited shelf life.',
  'Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6(1)(h)',
  '{}',
  '{"best_before"}',
  'recommended'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'LM-009',
  'Consumer Care Contact Details',
  'The name, address, and contact details of the person or office to be contacted in case of consumer complaint shall be mentioned.',
  'Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6(1)(cc)',
  '{}',
  '{"consumer_care"}',
  'recommended'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'PCR-010',
  'FSSAI License Number',
  'Food products must display the FSSAI license or registration number on the label.',
  'FSS (Packaging & Labelling) Regulations, 2011 — Regulation 2.4.2',
  '{"Food & Beverage", "Pharmaceutical"}',
  '{"fssai_number"}',
  'mandatory'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'PCR-011',
  'List of Ingredients',
  'Food products must declare a list of ingredients in descending order of their composition.',
  'FSS (Packaging & Labelling) Regulations, 2011 — Regulation 2.4.1',
  '{"Food & Beverage"}',
  '{"ingredients"}',
  'mandatory'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'PCR-012',
  'Nutritional Information',
  'Food products must display nutritional information per 100g/100ml or per serving.',
  'FSS (Packaging & Labelling) Regulations, 2011 — Regulation 2.4.3',
  '{"Food & Beverage"}',
  '{"nutrition"}',
  'recommended'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'PCR-013',
  'Vegetarian / Non-Vegetarian Symbol',
  'Food products must display the vegetarian (green dot) or non-vegetarian (brown dot) symbol.',
  'FSS (Packaging & Labelling) Regulations, 2011 — Regulation 2.2.1',
  '{"Food & Beverage"}',
  '{}',
  'mandatory'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'LM-014',
  'Barcode / EAN for Identification',
  'The package should bear a barcode or EAN code for identification and traceability.',
  'GS1 India Standards / Legal Metrology best practice',
  '{}',
  '{"barcode"}',
  'recommended'
) ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO compliance_rules (rule_code, rule_name, description, legal_reference, product_categories, required_fields, severity) VALUES
(
  'LM-015',
  'Brand Name or Trade Name',
  'The brand name or trade name under which the commodity is sold should be displayed on the package.',
  'Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6(1)(b) extended',
  '{}',
  '{"brand"}',
  'mandatory'
) ON CONFLICT (rule_code) DO NOTHING;
