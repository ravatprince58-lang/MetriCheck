import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { logAction } from '@/lib/audit';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge, EmptyState, ErrorState } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { isNotDetected, getFieldLabel } from '@/lib/ocr';
import { evaluateAllRules, getStatusBadgeVariant, getStatusLabel, type RuleEvaluation, type FieldValue } from '@/lib/compliance';
import {
  ShieldCheck,
  Scan,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Eye,
  FileText,
  Lock,
  ImageIcon,
} from 'lucide-react';
import type { ComplianceRule, ComplianceCheck, Inspection, InspectionImage, OcrResult, ExtractedField, ComplianceAutoStatus } from '@/types';

const VERIFICATION_STATUSES: ComplianceAutoStatus[] = [
  'COMPLIANT',
  'NON_COMPLIANT',
  'NOT_DETECTED',
  'MISSING',
  'NOT_APPLICABLE',
  'NEEDS_REVIEW',
];

export function CompliancePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [existingChecks, setExistingChecks] = useState<ComplianceCheck[]>([]);
  const [images, setImages] = useState<InspectionImage[]>([]);
  const [ocrFields, setOcrFields] = useState<FieldValue[]>([]);
  const [evaluations, setEvaluations] = useState<RuleEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [evidenceModal, setEvidenceModal] = useState<{ open: boolean; imageId: string | null }>({ open: false, imageId: null });
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [statusMap, setStatusMap] = useState<Record<string, ComplianceAutoStatus>>({});

  const loadData = useCallback(async () => {
    if (!id) return;
    setError(null);

    const [inspRes, rulesRes, imgRes, ocrRes, checksRes] = await Promise.all([
      supabase.from('inspections').select('*').eq('id', id).maybeSingle(),
      supabase.from('compliance_rules').select('*').eq('is_active', true).order('rule_code'),
      supabase.from('inspection_images').select('*').eq('inspection_id', id).order('created_at'),
      supabase.from('ocr_results').select(`
        *,
        extracted_fields (
          id, ocr_result_id, field_name, field_value, confidence, created_at
        )
      `).eq('inspection_id', id).order('created_at'),
      supabase.from('compliance_checks').select('*').eq('inspection_id', id),
    ]);

    if (inspRes.error) { setError('Could not load inspection.'); setLoading(false); return; }
    if (!inspRes.data) { setError('Inspection not found.'); setLoading(false); return; }
    if (rulesRes.error) { setError('Could not load compliance rules.'); setLoading(false); return; }

    setInspection(inspRes.data as Inspection);
    setRules(rulesRes.data as ComplianceRule[]);
    setImages(imgRes.data as InspectionImage[] || []);
    setExistingChecks((checksRes.data as ComplianceCheck[]) || []);

    // Build field values from OCR results
    const fields: FieldValue[] = [];

    const ocrData =
      (ocrRes.data as (OcrResult & {
        extracted_fields: ExtractedField[];
      })[]) || [];

    // First add OCR values
    for (const ocr of ocrData) {
      for (const field of ocr.extracted_fields || []) {
        fields.push({
          field_name: field.field_name,
          field_value: field.field_value,
          image_id: ocr.image_id,
        });
      }
    }

    // Add manually entered values when available
    const manualDetails =
      (inspRes.data as Inspection).manual_details || {};

    for (const [fieldName, fieldValue] of Object.entries(
      manualDetails
    )) {
      if (!fieldValue || !fieldValue.trim()) {
        continue;
      }

      // Remove the OCR NOT_DETECTED value for this field
      const existingIndexes: number[] = [];

      fields.forEach((field, index) => {
        if (
          field.field_name.trim().toLowerCase() ===
          fieldName.trim().toLowerCase()
        ) {
          existingIndexes.push(index);
        }
      });

      // Remove only NOT_DETECTED OCR values
      for (let i = existingIndexes.length - 1; i >= 0; i--) {
        if (isNotDetected(fields[existingIndexes[i]].field_value)) {
          fields.splice(existingIndexes[i], 1);
        }
      }

      // Manual value becomes the value used by compliance
      fields.push({
        field_name: fieldName,
        field_value: fieldValue.trim(),
        image_id: '',
      });
    }
    setOcrFields(fields);

    // Evaluate rules
    const evals = evaluateAllRules(
      rulesRes.data as ComplianceRule[],
      (inspRes.data as Inspection).product_category || '',
      fields
    );
    setEvaluations(evals);

    // Initialize maps from existing checks
    const checks = (checksRes.data as ComplianceCheck[]) || [];
    const nMap: Record<string, string> = {};
    const sMap: Record<string, ComplianceAutoStatus> = {};
    for (const check of checks) {
      nMap[check.rule_id] = check.inspector_notes || '';
      if (check.verified_status) {
        sMap[check.rule_id] = check.verified_status;
      }
    }
    setNotesMap(nMap);
    setStatusMap(sMap);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runComplianceCheck = async () => {
    if (!id || evaluations.length === 0) return;
    setRunning(true);
    setError(null);

    try {
      // Delete existing checks for this inspection
      await supabase.from('compliance_checks').delete().eq('inspection_id', id);

      // Insert new checks
      const rows = evaluations.map((evalResult) => ({
        inspection_id: id,
        rule_id: evalResult.rule.id,
        detected_values: evalResult.detected_values,
        auto_status: evalResult.auto_status,
        evidence_image_id: evalResult.evidence_image_id,
      }));

      const { error: insertError } = await supabase.from('compliance_checks').insert(rows);

      if (insertError) {
        setError('Could not save compliance checks. Please try again.');
      } else {
        await logAction('compliance_checked', 'inspection', id, {
          rules_evaluated: evaluations.length,
        });
        await loadData();
      }
    } catch {
      setError('An unexpected error occurred while running compliance checks.');
    }
    setRunning(false);
  };

  const handleVerify = async (ruleId: string) => {
    if (!id || !user) return;
    setSavingId(ruleId);
    setError(null);

    const verifiedStatus = statusMap[ruleId];
    const notes = notesMap[ruleId] || '';

    const { error } = await supabase
      .from('compliance_checks')
      .update({
        verified_status: verifiedStatus,
        inspector_notes: notes,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('inspection_id', id)
      .eq('rule_id', ruleId);

    if (error) {
      setError('Could not save verification. Please try again.');
    } else {
      await logAction('compliance_verified', 'inspection', id, {
        rule_id: ruleId,
        verified_status: verifiedStatus,
      });
      await loadData();
    }
    setSavingId(null);
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const getImageById = (imageId: string | null) => {
    if (!imageId) return null;
    return images.find((img) => img.id === imageId) || null;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-20"><Spinner size="lg" /></div>
      </AppLayout>
    );
  }

  if (error && !inspection) {
    return (
      <AppLayout>
        <ErrorState message={error} />
      </AppLayout>
    );
  }

  const summary = {
    COMPLIANT: evaluations.filter((e) => e.auto_status === 'COMPLIANT').length,
    NOT_DETECTED: evaluations.filter((e) => e.auto_status === 'NOT_DETECTED').length,
    NEEDS_REVIEW: evaluations.filter((e) => e.auto_status === 'NEEDS_REVIEW').length,
  };

  const verifiedCount = Object.keys(statusMap).length;
  const totalRules = evaluations.length;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Legal Metrology / Packaged Food Label Compliance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Automated compliance check against packaged food label declaration requirements. OCR-extracted information is evaluated against applicable rules. Verify each finding before proceeding.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2 text-sm">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs">1</span>
          Product details
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs">2</span>
          Image upload
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs">3</span>
          OCR / Product info
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-teal-600 font-medium">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white text-xs">4</span>
          Compliance
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">5</span>
          Verification
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">6</span>
          Report
        </div>
      </div>

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      {/* Product context */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Product</p>
              <p className="text-sm font-medium text-slate-900">{inspection?.product_name || 'Untitled'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Category</p>
              <p className="text-sm font-medium text-slate-900">{inspection?.product_category || 'Uncategorized'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">OCR Fields Found</p>
              <p className="text-sm font-medium text-slate-900">
                {ocrFields.filter((f) => !isNotDetected(f.field_value)).length} detected
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Images</p>
              <p className="text-sm font-medium text-slate-900">{images.length}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* OCR data availability warning */}
      {ocrFields.filter((f) => !isNotDetected(f.field_value)).length === 0 && (
        <div className="mb-6">
          <Alert variant="warning" title="No OCR data available">
            No product information has been extracted from images yet. Run OCR on your uploaded images first,
            then run the compliance check. Fields not detected by OCR will be marked as "Not detected — Manual verification required."
          </Alert>
        </div>
      )}

      {/* Summary + Run button */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-3">
          <div className="rounded-lg bg-emerald-50 px-4 py-2.5 text-center">
            <p className="text-2xl font-bold text-emerald-600">{summary.COMPLIANT}</p>
            <p className="text-xs text-emerald-700">Compliant</p>
          </div>
          <div className="rounded-lg bg-amber-50 px-4 py-2.5 text-center">
            <p className="text-2xl font-bold text-amber-600">{summary.NOT_DETECTED}</p>
            <p className="text-xs text-amber-700">Not Detected</p>
          </div>
          <div className="rounded-lg bg-sky-50 px-4 py-2.5 text-center">
            <p className="text-2xl font-bold text-sky-600">{summary.NEEDS_REVIEW}</p>
            <p className="text-xs text-sky-700">Needs Review</p>
          </div>
          {verifiedCount > 0 && (
            <div className="rounded-lg bg-teal-50 px-4 py-2.5 text-center">
              <p className="text-2xl font-bold text-teal-600">{verifiedCount}</p>
              <p className="text-xs text-teal-700">Verified</p>
            </div>
          )}
        </div>
        <Button onClick={runComplianceCheck} loading={running} disabled={evaluations.length === 0}>
          <Scan className="h-4 w-4" />
          Run compliance check
        </Button>
      </div>

      {/* Rules list */}
      {evaluations.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<ShieldCheck className="h-12 w-12" />}
              title="No applicable rules"
              description="No compliance rules are applicable for this product category. Run the compliance check to confirm."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {evaluations.map((evalResult, idx) => {
            const rule = evalResult.rule;
            const existingCheck = existingChecks.find((c) => c.rule_id === rule.id);
            const currentStatus = statusMap[rule.id] || existingCheck?.verified_status || null;
            const isVerified = currentStatus !== null && existingCheck?.verified_status === currentStatus;
            const evidenceImage = getImageById(evalResult.evidence_image_id);

            return (
              <Card key={rule.id} className={isVerified ? 'border-teal-200' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${evalResult.auto_status === 'COMPLIANT' ? 'bg-emerald-100' :
                          evalResult.auto_status === 'NOT_DETECTED' ? 'bg-amber-100' :
                            'bg-sky-100'
                        }`}>
                        {evalResult.auto_status === 'COMPLIANT' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> :
                          evalResult.auto_status === 'NOT_DETECTED' ? <AlertCircle className="h-5 w-5 text-amber-600" /> :
                            <HelpCircle className="h-5 w-5 text-sky-600" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">{rule.rule_code}</span>
                          {rule.severity === 'mandatory' ? (
                            <Badge variant="error">Mandatory</Badge>
                          ) : (
                            <Badge variant="default">Recommended</Badge>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{rule.rule_name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{rule.legal_reference}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <Badge variant={getStatusBadgeVariant(evalResult.auto_status)}>
                        {getStatusLabel(evalResult.auto_status)}
                      </Badge>
                      {isVerified && (
                        <span className="flex items-center gap-1 text-xs text-teal-600 font-medium">
                          <Lock className="h-3 w-3" /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  {/* Rule description */}
                  <p className="text-sm text-slate-600 mb-4">{rule.description}</p>

                  {/* Detected values */}
                  {rule.required_fields.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Required Declarations</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {rule.required_fields.map((fieldKey) => {
                          const value = evalResult.detected_values[fieldKey] || '';
                          const notDetected = isNotDetected(value);
                          return (
                            <div key={fieldKey} className="rounded-lg border border-slate-200 p-3">
                              <p className="text-xs font-medium text-slate-400">{getFieldLabel(fieldKey)}</p>
                              <div className="flex items-start gap-1.5 mt-1">
                                {notDetected ? (
                                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                )}
                                <span className={`text-sm ${notDetected ? 'text-slate-400 italic' : 'text-slate-700 font-medium'}`}>
                                  {notDetected ? 'Not detected — Manual verification required.' : value}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Evidence */}
                  {evidenceImage && (
                    <div className="mb-4">
                      <button
                        onClick={() => setEvidenceModal({ open: true, imageId: evidenceImage.id })}
                        className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        View evidence image
                      </button>
                    </div>
                  )}

                  {/* No required fields note */}
                  {rule.required_fields.length === 0 && (
                    <div className="mb-4 rounded-lg bg-sky-50 border border-sky-200 p-3">
                      <p className="text-xs text-sky-700">
                        This rule requires visual inspection of the package. No OCR fields are checked automatically.
                        The inspector must examine the product image and determine compliance manually.
                      </p>
                    </div>
                  )}

                  {/* Inspector verification */}
                  {existingCheck && (
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Inspector Verification</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select
                          label="Verified status"
                          value={currentStatus || ''}
                          onChange={(e) => setStatusMap((prev) => ({ ...prev, [rule.id]: e.target.value as ComplianceAutoStatus }))}
                        >
                          <option value="">Select status...</option>
                          {VERIFICATION_STATUSES.map((s) => (
                            <option key={s} value={s}>{getStatusLabel(s)}</option>
                          ))}
                        </Select>
                        <Textarea
                          label="Inspector notes"
                          rows={2}
                          value={notesMap[rule.id] || ''}
                          onChange={(e) => setNotesMap((prev) => ({ ...prev, [rule.id]: e.target.value }))}
                          placeholder="Add notes about this verification..."
                        />
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleVerify(rule.id)}
                          loading={savingId === rule.id}
                          disabled={!statusMap[rule.id]}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Save verification
                        </Button>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={() => navigate(`/inspections/${id}/results`)}>
          <ArrowLeft className="h-4 w-4" />
          Back to product info
        </Button>
        <Button onClick={() => navigate(`/inspections/${id}/verify`)}>
          Continue to verification
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Evidence image modal */}
      <Modal
        open={evidenceModal.open}
        onClose={() => setEvidenceModal({ open: false, imageId: null })}
        title="Evidence Image"
        size="lg"
      >
        {(() => {
          const img = getImageById(evidenceModal.imageId);
          if (!img) return <p className="text-sm text-slate-500">Image not found.</p>;
          return (
            <div>
              <img
                src={getImageUrl(img.storage_path)}
                alt={img.file_name}
                className="w-full rounded-lg"
              />
              <p className="mt-3 text-sm text-slate-500">{img.file_name}</p>
            </div>
          );
        })()}
      </Modal>
    </AppLayout>
  );
}
