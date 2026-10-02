import { isNotDetected } from '@/lib/ocr';
import type { ComplianceRule, ComplianceAutoStatus } from '@/types';

export interface FieldValue {
  field_name: string;
  field_value: string;
  image_id: string;
}

export interface RuleEvaluation {
  rule: ComplianceRule;
  auto_status: ComplianceAutoStatus;
  detected_values: Record<string, string>;
  evidence_image_id: string | null;
}

/**
 * Determine which rules apply to a given product category.
 * Rules with empty product_categories apply to ALL categories.
 * Rules with specific categories apply only if the product's category matches.
 */
export function getApplicableRules(allRules: ComplianceRule[], productCategory: string): ComplianceRule[] {
  return allRules.filter((rule) => {
    if (!rule.is_active) return false;
    if (!rule.product_categories || rule.product_categories.length === 0) return true;
    return rule.product_categories.some(
      (cat) => cat.toLowerCase() === productCategory.toLowerCase()
    );
  });
}

/**
 * Evaluate a single rule against the extracted OCR fields.
 *
 * Status logic:
 * - NOT_APPLICABLE: rule has no required_fields (e.g. veg/non-veg symbol — visual check only)
 * - COMPLIANT: all required fields have detected values
 * - NOT_DETECTED: some required fields were not detected by OCR
 *   (This is NOT the same as NON_COMPLIANT — the info may be on the package
 *   but not recognized by OCR. Inspector must verify.)
 * - NEEDS_REVIEW: edge case requiring manual inspection
 */
export function evaluateRule(
  rule: ComplianceRule,
  fields: FieldValue[]
): RuleEvaluation {
  const requiredFields = rule.required_fields || [];
  const detectedValues: Record<string, string> = {};
  let evidenceImageId: string | null = null;

  // Collect values for each required field
  for (const fieldKey of requiredFields) {
    const field = fields.find(
      (f) => f.field_name === fieldKey && !isNotDetected(f.field_value)
    );
    if (field) {
      detectedValues[fieldKey] = field.field_value;
      if (!evidenceImageId) {
        evidenceImageId = field.image_id;
      }
    } else {
      detectedValues[fieldKey] = '';
    }
  }

  // If rule has no required fields, it's a visual/manual check
  if (requiredFields.length === 0) {
    return {
      rule,
      auto_status: 'NEEDS_REVIEW',
      detected_values: detectedValues,
      evidence_image_id: null,
    };
  }

  // Check if all required fields are detected
  const allDetected = requiredFields.every(
    (key) => detectedValues[key] && !isNotDetected(detectedValues[key])
  );

  if (allDetected) {
    return {
      rule,
      auto_status: 'COMPLIANT',
      detected_values: detectedValues,
      evidence_image_id: evidenceImageId,
    };
  }

  // Some fields not detected — this is NOT_DETECTED, not NON_COMPLIANT
  return {
    rule,
    auto_status: 'NOT_DETECTED',
    detected_values: detectedValues,
    evidence_image_id: evidenceImageId,
  };
}

/**
 * Evaluate all applicable rules for an inspection.
 */
export function evaluateAllRules(
  allRules: ComplianceRule[],
  productCategory: string,
  fields: FieldValue[]
): RuleEvaluation[] {
  const applicable = getApplicableRules(allRules, productCategory);
  return applicable.map((rule) => evaluateRule(rule, fields));
}

/**
 * Get a summary of compliance evaluation results.
 */
export function getComplianceSummary(evaluations: RuleEvaluation[]) {
  const summary = {
    COMPLIANT: 0,
    NON_COMPLIANT: 0,
    NOT_DETECTED: 0,
    MISSING: 0,
    NOT_APPLICABLE: 0,
    NEEDS_REVIEW: 0,
  };

  for (const evalResult of evaluations) {
    summary[evalResult.auto_status]++;
  }

  return summary;
}

/**
 * Get a human-readable label for a status.
 */
export function getStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

/**
 * Get the badge variant for a status.
 */
export function getStatusBadgeVariant(status: string): 'success' | 'error' | 'warning' | 'info' | 'default' {
  switch (status) {
    case 'COMPLIANT': return 'success';
    case 'NON_COMPLIANT': return 'error';
    case 'NOT_DETECTED': return 'warning';
    case 'MISSING': return 'warning';
    case 'NOT_APPLICABLE': return 'default';
    case 'NEEDS_REVIEW': return 'info';
    default: return 'default';
  }
}
