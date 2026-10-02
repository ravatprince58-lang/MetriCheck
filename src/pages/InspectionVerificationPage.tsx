import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { logAction } from '@/lib/audit';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge, EmptyState } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Input';
import { ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck, Scan, FileText, ImageIcon, AlertCircle } from 'lucide-react';
import { getFieldLabel, isNotDetected, getNotDetectedMessage, FIELD_ORDER } from '@/lib/ocr';
import type { Inspection, InspectionImage, OcrResult, ExtractedField, ComplianceCheck, ComplianceRule } from '@/types';

export function InspectionVerificationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [images, setImages] = useState<InspectionImage[]>([]);
  const [ocrResults, setOcrResults] = useState<{ ocrResult: OcrResult; fields: ExtractedField[] }[]>([]);
  const [complianceChecks, setComplianceChecks] = useState<(ComplianceCheck & { rule?: ComplianceRule })[]>([]);
  const [manualFields, setManualFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [readOnly, setReadOnly] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setError(null);

    const [inspRes, imgRes, ocrRes, checksRes] = await Promise.all([
      supabase.from('inspections').select('*').eq('id', id).maybeSingle(),
      supabase.from('inspection_images').select('*').eq('inspection_id', id).order('created_at'),
      supabase.from('ocr_results').select(`
        *,
        extracted_fields (
          id, ocr_result_id, field_name, field_value, confidence, created_at
        )
      `).eq('inspection_id', id).order('created_at', { ascending: true }),
      supabase.from('compliance_checks').select('*, rule:compliance_rules(*)').eq('inspection_id', id).order('created_at'),
    ]);

    if (inspRes.error || !inspRes.data) {
      setError('Could not load inspection.');
      setLoading(false);
      return;
    }

    setInspection(inspRes.data as Inspection);
    setReadOnly((inspRes.data as Inspection).status === 'completed');
    setImages((imgRes.data as InspectionImage[]) || []);
    setComplianceChecks((checksRes.data as (ComplianceCheck & { rule?: ComplianceRule })[]) || []);
    setManualFields((inspRes.data as Inspection).manual_details || {});

    const ocrData = (ocrRes.data as (OcrResult & { extracted_fields: ExtractedField[] })[]) || [];
    setOcrResults(ocrData.map((ocr) => ({ ocrResult: ocr, fields: (ocr.extracted_fields || []) as ExtractedField[] })));

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  // Aggregate OCR fields
  const fieldMap = new Map<string, string>();
  for (const { fields } of ocrResults) {
    for (const field of fields) {
      if (!isNotDetected(field.field_value) && !fieldMap.has(field.field_name)) {
        fieldMap.set(field.field_name, field.field_value);
      }
    }
  }
  const allFields = FIELD_ORDER.map((key) => ({
    field_name: key,
    field_value: manualFields[key]?.trim() || fieldMap.get(key) || '',
    source: manualFields[key]?.trim() ? (fieldMap.has(key) ? 'OCR corrected' : 'Manual') : 'OCR',
  }));
  const detectedCount = allFields.filter((f) => !isNotDetected(f.field_value)).length;

  const unverifiedChecks = complianceChecks.filter((c) => !c.verified_status);
  const nonCompliantCount = complianceChecks.filter((c) => c.verified_status === 'NON_COMPLIANT' || (!c.verified_status && c.auto_status === 'NON_COMPLIANT')).length;

  const handleConfirm = async () => {
    if (!id || !user) return;
    setConfirming(true);
    setError(null);

    if (readOnly) { navigate(`/inspections/${id}/report`); return; }
    const { error: rpcError } = await supabase.rpc('complete_inspection', { p_inspection_id: id });
    const updateError = rpcError;

    if (updateError) {
      setError('Could not confirm inspection. Please try again.');
      setConfirming(false);
      return;
    }

    await logAction('inspection_verified', 'inspection', id, {
      review_notes: reviewNotes,
      fields_detected: detectedCount,
      compliance_checks: complianceChecks.length,
      unverified_checks: unverifiedChecks.length,
    });

    setSuccess('Inspection verified and confirmed.');
    setConfirming(false);
    navigate(`/inspections/${id}/report`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-20"><Spinner size="lg" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Inspection verification</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review the uploaded package images, OCR-extracted information, and compliance findings before confirming this inspection.
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
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs">4</span>
          Compliance
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-teal-600 font-medium">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white text-xs">5</span>
          Verification
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">6</span>
          Report
        </div>
      </div>

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
      {success && <div className="mb-4"><Alert variant="success">{success}</Alert></div>}

      {/* Uploaded images */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-teal-600" />
            <CardTitle>Uploaded package images ({images.length})</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          {images.length === 0 ? (
            <EmptyState icon={<ImageIcon className="h-12 w-12" />} title="No images uploaded" description="No package images were uploaded for this inspection." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div key={image.id} className="rounded-lg overflow-hidden border border-slate-200">
                  <img src={getImageUrl(image.storage_path)} alt={image.file_name} className="h-32 w-full object-cover" />
                  <div className="p-2">
                    <p className="text-xs text-slate-500 truncate">{image.file_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* OCR-extracted information */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-teal-600" />
            <CardTitle>OCR-extracted product information ({detectedCount} detected)</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          {ocrResults.length === 0 ? (
            <EmptyState icon={<Scan className="h-12 w-12" />} title="No OCR data" description="OCR has not been run on any images yet." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {allFields.map((field) => {
                const notDetected = isNotDetected(field.field_value);
                return (
                  <div key={field.field_name} className="flex flex-col">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      {getFieldLabel(field.field_name)}
                    </span>
                    <div className="flex items-start gap-1.5 mt-0.5">
                      {notDetected ? (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex flex-col">
                        <span className={`text-sm ${notDetected ? 'text-slate-400 italic' : 'text-slate-700 font-medium'}`}>
                          {notDetected ? getNotDetectedMessage() : field.field_value}
                        </span>
                        {!notDetected && <span className="mt-1 text-xs text-slate-400">Source: {field.source}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Compliance findings summary */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-600" />
            <CardTitle>Compliance findings ({complianceChecks.length})</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          {complianceChecks.length === 0 ? (
            <EmptyState icon={<ShieldCheck className="h-12 w-12" />} title="No compliance checks" description="Run the compliance check on the compliance page first." />
          ) : (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="rounded-lg bg-emerald-50 px-4 py-2 text-center">
                  <p className="text-xl font-bold text-emerald-600">{complianceChecks.filter((c) => c.verified_status === 'COMPLIANT' || (!c.verified_status && c.auto_status === 'COMPLIANT')).length}</p>
                  <p className="text-xs text-emerald-700">Compliant</p>
                </div>
                <div className="rounded-lg bg-red-50 px-4 py-2 text-center">
                  <p className="text-xl font-bold text-red-600">{nonCompliantCount}</p>
                  <p className="text-xs text-red-700">Non-compliant</p>
                </div>
                <div className="rounded-lg bg-amber-50 px-4 py-2 text-center">
                  <p className="text-xl font-bold text-amber-600">{complianceChecks.filter((c) => c.verified_status === 'NOT_DETECTED' || (!c.verified_status && c.auto_status === 'NOT_DETECTED')).length}</p>
                  <p className="text-xs text-amber-700">Not detected</p>
                </div>
                <div className="rounded-lg bg-sky-50 px-4 py-2 text-center">
                  <p className="text-xl font-bold text-sky-600">{unverifiedChecks.length}</p>
                  <p className="text-xs text-sky-700">Unverified</p>
                </div>
              </div>
              {unverifiedChecks.length > 0 && (
                <Alert variant="warning" title="Unverified compliance checks">
                  {unverifiedChecks.length} compliance check(s) have not been verified. Go back to the compliance page to review and verify them before confirming this inspection.
                </Alert>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Review notes and confirm */}
      {readOnly && <div className="mb-6"><Alert variant="info" title="Read-only completed inspection">This inspection is completed. The final result below is locked.</Alert></div>}

      <Card className="mb-6 border-teal-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            <CardTitle>Inspector review & confirmation</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <Textarea
            disabled={readOnly}
            label="Review notes (optional)"
            rows={3}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Add any corrections or observations about this inspection..."
          />
          <div className="mt-4 rounded-lg bg-sky-50 border border-sky-200 p-3">
            <p className="text-xs text-sky-700">
              By confirming this inspection, you verify that the uploaded images, OCR-extracted information, and compliance findings have been reviewed. The inspection status will be marked as completed and a final report will be generated.
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleConfirm} loading={confirming} disabled={readOnly || unverifiedChecks.length > 0}>
              <CheckCircle2 className="h-4 w-4" />
              Confirm & complete inspection
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate(`/inspections/${id}/compliance`)}>
          <ArrowLeft className="h-4 w-4" />
          Back to compliance
        </Button>
        <Button variant="outline" onClick={() => navigate(`/inspections/${id}/report`)}>
          View report
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </AppLayout>
  );
}
