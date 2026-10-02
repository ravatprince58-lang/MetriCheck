export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type InspectionStatus = 'draft' | 'in_progress' | 'completed';
export type ResultStatus = 'pass' | 'fail' | 'pending';
export type UserRole = 'inspector' | 'admin';
export type AccountType = 'inspector' | 'demo';
export type AccessStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type OcrStatus = 'pending' | 'completed' | 'failed';
export type FindingSeverity = 'info' | 'warning' | 'critical';
export type FindingStatus = 'open' | 'resolved' | 'acknowledged';
export type VerificationAction = 'submitted' | 'approved' | 'rejected' | 'requested_info';

export interface Profile {
  id: string;
  full_name: string | null;
  badge_number: string | null;
  organization: string | null;
  phone: string | null;
  role: UserRole;
  account_type: AccountType;
  access_status: AccessStatus;
  access_notes: string | null;
  verification_status: VerificationStatus;
  verification_notes: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccessRequest {
  id: string;
  requested_user_id: string | null;
  name: string;
  email: string;
  organization: string;
  phone: string;
  product_name: string;
  brand_name: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsumerGrievance {
  id: string;
  name: string;
  email: string;
  product_name: string;
  category: string;
  complaint: string;
  status: 'submitted' | 'in_review' | 'resolved' | 'closed';
  created_at: string;
}

export interface Inspection {
  id: string;
  user_id: string;
  product_name: string;
  product_category: string;
  manufacturer: string;
  batch_number: string;
  inspection_type: string;
  status: InspectionStatus;
  notes: string;
  manual_details: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface InspectionImage {
  id: string;
  inspection_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface InspectionResult {
  id: string;
  inspection_id: string;
  parameter_name: string;
  standard_value: string;
  measured_value: string;
  unit: string;
  tolerance_min: string;
  tolerance_max: string;
  result: ResultStatus;
  notes: string;
  created_at: string;
}

export interface OcrResult {
  id: string;
  image_id: string;
  inspection_id: string;
  raw_text: string;
  confidence: number;
  status: OcrStatus;
  processed_at: string | null;
  created_at: string;
}

export interface ExtractedField {
  id: string;
  ocr_result_id: string;
  field_name: string;
  field_value: string;
  confidence: number;
  bounding_box: Record<string, unknown> | null;
  created_at: string;
}

export interface ComplianceFinding {
  id: string;
  inspection_id: string;
  rule_name: string;
  severity: FindingSeverity;
  status: FindingStatus;
  description: string;
  recommendation: string;
  created_at: string;
}

export interface VerificationRecord {
  id: string;
  inspector_id: string;
  reviewer_id: string | null;
  action: VerificationAction;
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  inspection_id: string;
  report_number: string;
  summary: string;
  overall_result: ResultStatus;
  total_parameters: number;
  pass_count: number;
  fail_count: number;
  generated_at: string;
  created_at: string;
}

export type ComplianceAutoStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_DETECTED' | 'MISSING' | 'NOT_APPLICABLE' | 'NEEDS_REVIEW';
export type ComplianceVerifiedStatus = ComplianceAutoStatus;
export type RuleSeverity = 'mandatory' | 'recommended';

export interface ComplianceRule {
  id: string;
  rule_code: string;
  rule_name: string;
  description: string;
  legal_reference: string;
  product_categories: string[];
  required_fields: string[];
  severity: RuleSeverity;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplianceCheck {
  id: string;
  inspection_id: string;
  rule_id: string;
  detected_values: Record<string, string>;
  auto_status: ComplianceAutoStatus;
  verified_status: ComplianceVerifiedStatus | null;
  inspector_notes: string;
  evidence_image_id: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceCheckWithRule extends ComplianceCheck {
  rule?: ComplianceRule;
}

export interface InspectionWithDetails extends Inspection {
  inspection_images?: InspectionImage[];
  inspection_results?: InspectionResult[];
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}
