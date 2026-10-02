import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { useParams, Link } from 'react-router-dom';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState, ErrorState } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { CheckCircle2, XCircle, Clock, Download, ArrowLeft, FileText, ImageIcon, ShieldCheck, AlertTriangle, Scan } from 'lucide-react';
import { getFieldLabel, isNotDetected, getNotDetectedMessage, FIELD_ORDER } from '@/lib/ocr';
import type { Inspection, InspectionImage, ComplianceFinding, ComplianceCheck, ComplianceRule, Report, OcrResult, ExtractedField, FindingSeverity } from '@/types';

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [images, setImages] = useState<InspectionImage[]>([]);
  const [ocrResults, setOcrResults] = useState<{ ocrResult: OcrResult; fields: ExtractedField[] }[]>([]);
  const [findings, setFindings] = useState<ComplianceFinding[]>([]);
  const [complianceChecks, setComplianceChecks] = useState<(ComplianceCheck & { rule?: ComplianceRule })[]>([]);
  const [manualFields, setManualFields] = useState<Record<string, string>>({});
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const [inspRes, imgRes, ocrRes, findRes, rptRes, checksRes] = await Promise.all([
        supabase.from('inspections').select('*').eq('id', id).maybeSingle(),
        supabase.from('inspection_images').select('*').eq('inspection_id', id).order('created_at'),
        supabase.from('ocr_results').select(`
          *,
          extracted_fields (
            id, ocr_result_id, field_name, field_value, confidence, created_at
          )
        `).eq('inspection_id', id).order('created_at', { ascending: true }),
        supabase.from('compliance_findings').select('*').eq('inspection_id', id).order('created_at'),
        supabase.from('reports').select('*').eq('inspection_id', id).maybeSingle(),
        supabase.from('compliance_checks').select('*, rule:compliance_rules(*)').eq('inspection_id', id).order('created_at'),
      ]);

      if (checksRes.data) setComplianceChecks(checksRes.data as (ComplianceCheck & { rule?: ComplianceRule })[]);

      if (inspRes.error) { setError(inspRes.error.message); setLoading(false); return; }
      if (!inspRes.data) { setError('Inspection not found.'); setLoading(false); return; }

      setInspection(inspRes.data as Inspection);
      if (imgRes.data) setImages(imgRes.data as InspectionImage[]);
      if (findRes.data) setFindings(findRes.data as ComplianceFinding[]);
      if (rptRes.data) setReport(rptRes.data as Report);
      setManualFields((inspRes.data as Inspection).manual_details || {});

      const ocrData = (ocrRes.data as (OcrResult & { extracted_fields: ExtractedField[] })[]) || [];
      setOcrResults(ocrData.map((ocr) => ({ ocrResult: ocr, fields: (ocr.extracted_fields || []) as ExtractedField[] })));

      setLoading(false);
    }
    load();
  }, [id]);

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handlePrint = () => window.print();
  const handleDownloadPdf = () => {
    if (!inspection) return;

    const doc = new jsPDF();

    let y = 20;

    const addText = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 20, y);

      doc.setFont('helvetica', 'normal');
      doc.text(value || '—', 75, y);

      y += 8;

      if (y > 275) {
        doc.addPage();
        y = 20;
      }
    };

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MetriCheck Inspector', 20, y);

    y += 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Packaged Commodity Compliance Report', 20, y);

    y += 15;

    // Report information
    doc.setFontSize(11);

    addText(
      'Report No:',
      report?.report_number || inspection.id.slice(0, 8).toUpperCase()
    );

    addText(
      'Date:',
      new Date(report?.generated_at || inspection.created_at)
        .toLocaleDateString()
    );

    addText('Status:', overallResult.toUpperCase());

    y += 5;

    // Product details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Product Details', 20, y);

    y += 10;

    doc.setFontSize(11);

    addText('Product Name:', inspection.product_name || '—');
    addText('Category:', inspection.product_category || '—');
    addText('Inspection Type:', inspection.inspection_type || '—');
    addText('Status:', inspection.status.replace('_', ' '));

    if (inspection.notes) {
      addText('Notes:', inspection.notes);
    }

    y += 5;

    // Extracted information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Extracted Product Information', 20, y);

    y += 10;

    doc.setFontSize(10);

    for (const field of allFields) {
      const value = field.field_value || 'Not detected — Manual verification required.';

      const label = getFieldLabel(field.field_name);

      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 20, y);

      doc.setFont('helvetica', 'normal');

      const wrapped = doc.splitTextToSize(value, 115);
      doc.text(wrapped, 75, y);

      y += Math.max(7, wrapped.length * 5);

      if (y > 275) {
        doc.addPage();
        y = 20;
      }
    }

    y += 5;

    // Compliance summary
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Compliance Summary', 20, y);

    y += 10;

    doc.setFontSize(11);

    addText('Compliant:', String(compliantCount));
    addText('Non-Compliant:', String(nonCompliantCount));
    addText('Not Detected:', String(notDetectedCount));
    addText('Needs Review:', String(needsReviewCount));
    addText('Overall Result:', overallResult.toUpperCase());

    // Footer
    const pageCount = doc.getNumberOfPages();

    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `MetriCheck Inspector | Page ${page} of ${pageCount}`,
        20,
        290
      );
    }

    const fileName =
      `MetriCheck-${inspection.product_name || 'Inspection'}-${inspection.id.slice(0, 8)}.pdf`
        .replace(/[^a-zA-Z0-9._-]/g, '_');

    doc.save(fileName);
  };

  // Aggregate OCR fields
  const fieldMap = new Map<string, string>();
  for (const { fields } of ocrResults) {
    for (const field of fields) {
      if (!isNotDetected(field.field_value) && !fieldMap.has(field.field_name)) fieldMap.set(field.field_name, field.field_value);
    }
  }
  for (const [fieldName, value] of Object.entries(manualFields)) {
    if (value.trim()) fieldMap.set(fieldName, value);
  }
  const allFields = FIELD_ORDER.map((key) => ({ field_name: key, field_value: fieldMap.get(key) || '' }));
  const detectedCount = allFields.filter((f) => !isNotDetected(f.field_value)).length;

  const effectiveStatus = (c: ComplianceCheck) => c.verified_status || c.auto_status;
  const compliantCount = complianceChecks.filter((c) => effectiveStatus(c) === 'COMPLIANT').length;
  const nonCompliantCount = complianceChecks.filter((c) => effectiveStatus(c) === 'NON_COMPLIANT').length;
  const notDetectedCount = complianceChecks.filter((c) => effectiveStatus(c) === 'NOT_DETECTED' || effectiveStatus(c) === 'MISSING').length;
  const needsReviewCount = complianceChecks.filter((c) => effectiveStatus(c) === 'NEEDS_REVIEW').length;

  const overallResult = nonCompliantCount > 0 ? 'fail' : notDetectedCount > 0 || needsReviewCount > 0 ? 'pending' : compliantCount > 0 ? 'pass' : 'pending';

  if (loading) {
    return (
      <AppLayout>
        <div className="py-20"><Spinner size="lg" /></div>
      </AppLayout>
    );
  }

  if (error || !inspection) {
    return (
      <AppLayout>
        <ErrorState message={error || 'Inspection not found.'} />
      </AppLayout>
    );
  }

  const severityBadge = (severity: FindingSeverity) => {
    const map: Record<FindingSeverity, 'info' | 'warning' | 'error'> = { info: 'info', warning: 'warning', critical: 'error' };
    return <Badge variant={map[severity]}>{severity.charAt(0).toUpperCase() + severity.slice(1)}</Badge>;
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inspection report</h1>
          <p className="mt-1 text-sm text-slate-500">Final packaged commodity compliance inspection report.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handlePrint}>
            <Download className="h-4 w-4" />
            Print
          </Button>

          {inspection.status === 'completed' && (
            <Button onClick={handleDownloadPdf}>
              <FileText className="h-4 w-4" />
              Download PDF
            </Button>
          )}

          <Link to="/inspections">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back to history
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Report header */}
        <Card className="print:shadow-none print:border-slate-300">
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">MetriCheck Inspector</p>
                    <p className="text-xs text-slate-500">Packaged Food Label Compliance Report</p>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{inspection.product_name || 'Untitled product'}</h2>
                {report ? (
                  <p className="text-sm text-slate-500 mt-1">Report No: {report.report_number}</p>
                ) : (
                  <p className="text-sm text-slate-500 mt-1">Report ID: {inspection.id.slice(0, 8).toUpperCase()}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Date</p>
                <p className="text-sm font-medium text-slate-700">
                  {new Date(report?.generated_at || inspection.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div className="mt-3">
                  {overallResult === 'pass' && <Badge variant="success"><CheckCircle2 className="h-3.5 w-3.5 mr-1 inline" />PASS</Badge>}
                  {overallResult === 'fail' && <Badge variant="error"><XCircle className="h-3.5 w-3.5 mr-1 inline" />FAIL</Badge>}
                  {overallResult === 'pending' && <Badge variant="warning"><Clock className="h-3.5 w-3.5 mr-1 inline" />PENDING</Badge>}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Inspector info */}
        <Card>
          <CardHeader><CardTitle>Inspector information</CardTitle></CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Inspector</p>
                <p className="text-sm font-medium text-slate-700 mt-1">{profile?.full_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Badge number</p>
                <p className="text-sm font-medium text-slate-700 mt-1">{profile?.badge_number || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Organization</p>
                <p className="text-sm font-medium text-slate-700 mt-1">{profile?.organization || '—'}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Final statement */}
        <Card className="mb-6 border-teal-200">
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Final inspection statement</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {inspection.status === 'completed'
                ? overallResult === 'pass'
                  ? 'The inspected packaged commodity complies with the applicable requirements reviewed in this inspection.'
                  : overallResult === 'fail'
                    ? 'The inspected packaged commodity does not comply with one or more applicable requirements identified in this inspection.'
                    : 'The inspection was completed, but one or more requirements require further review.'
                : 'This inspection is not yet completed. The displayed result is provisional.'}
            </p>
            <p className="mt-2 text-sm text-slate-500">Overall result: <span className="font-semibold uppercase">{overallResult}</span></p>
          </CardBody>
        </Card>

        {/* Product details */}
        <Card>
          <CardHeader><CardTitle>Product details</CardTitle></CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Product name</p>
                <p className="text-sm font-medium text-slate-700 mt-1">{inspection.product_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Category</p>
                <p className="text-sm font-medium text-slate-700 mt-1">{inspection.product_category || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Inspection type</p>
                <p className="text-sm font-medium text-slate-700 mt-1">{inspection.inspection_type || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Status</p>
                <p className="text-sm font-medium text-slate-700 mt-1 capitalize">{inspection.status.replace('_', ' ')}</p>
              </div>
            </div>
            {inspection.notes && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Notes</p>
                <p className="text-sm text-slate-600 mt-1">{inspection.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* OCR-extracted product information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-teal-600" />
              <CardTitle>Extracted product information</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            {detectedCount === 0 ? (
              <EmptyState title="No OCR data available" description="No product information was extracted from uploaded images." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {allFields.map((field) => {
                  const notDetected = isNotDetected(field.field_value);
                  return (
                    <div key={field.field_name} className="flex flex-col">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                        {getFieldLabel(field.field_name)}
                      </span>
                      <span className={`text-sm mt-0.5 ${notDetected ? 'text-slate-400 italic' : 'text-slate-700 font-medium'}`}>
                        {notDetected ? getNotDetectedMessage() : field.field_value}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Compliance summary */}
        {complianceChecks.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
                <CardTitle>Legal Metrology compliance ({complianceChecks.length})</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="text-center rounded-lg bg-emerald-50 py-3">
                  <p className="text-2xl font-bold text-emerald-600">{compliantCount}</p>
                  <p className="text-xs text-emerald-700">Compliant</p>
                </div>
                <div className="text-center rounded-lg bg-red-50 py-3">
                  <p className="text-2xl font-bold text-red-600">{nonCompliantCount}</p>
                  <p className="text-xs text-red-700">Non-compliant</p>
                </div>
                <div className="text-center rounded-lg bg-amber-50 py-3">
                  <p className="text-2xl font-bold text-amber-600">{notDetectedCount}</p>
                  <p className="text-xs text-amber-700">Not detected</p>
                </div>
                <div className="text-center rounded-lg bg-sky-50 py-3">
                  <p className="text-2xl font-bold text-sky-600">{needsReviewCount}</p>
                  <p className="text-xs text-sky-700">Needs review</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      <th className="pb-3 pr-4">Rule</th>
                      <th className="pb-3 pr-4">Auto Status</th>
                      <th className="pb-3 pr-4">Verified Status</th>
                      <th className="pb-3">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {complianceChecks.map((check) => (
                      <tr key={check.id}>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-slate-900">{check.rule?.rule_name || 'Unknown rule'}</p>
                          <p className="text-xs text-slate-400">{check.rule?.rule_code}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={
                            check.auto_status === 'COMPLIANT' ? 'success' :
                              check.auto_status === 'NON_COMPLIANT' ? 'error' :
                                check.auto_status === 'NOT_DETECTED' ? 'warning' :
                                  check.auto_status === 'NEEDS_REVIEW' ? 'info' : 'default'
                          }>
                            {check.auto_status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {check.verified_status ? (
                            <Badge variant={
                              check.verified_status === 'COMPLIANT' ? 'success' :
                                check.verified_status === 'NON_COMPLIANT' ? 'error' :
                                  check.verified_status === 'NOT_DETECTED' ? 'warning' :
                                    check.verified_status === 'NEEDS_REVIEW' ? 'info' : 'default'
                            }>
                              {check.verified_status.replace(/_/g, ' ')}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">Not yet verified</span>
                          )}
                        </td>
                        <td className="py-3">
                          {check.rule?.severity === 'mandatory' ? (
                            <Badge variant="error">Mandatory</Badge>
                          ) : (
                            <Badge variant="default">Recommended</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {complianceChecks.some((c) => c.inspector_notes) && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  {complianceChecks.filter((c) => c.inspector_notes).map((check) => (
                    <div key={`note-${check.id}`} className="text-xs">
                      <span className="font-medium text-slate-600">{check.rule?.rule_code}:</span>{' '}
                      <span className="text-slate-500">{check.inspector_notes}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Compliance findings (manual) */}
        {findings.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <CardTitle>Additional compliance findings ({findings.length})</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {findings.map((finding) => (
                  <div key={finding.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                    <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${finding.severity === 'critical' ? 'text-red-500' : finding.severity === 'warning' ? 'text-amber-500' : 'text-sky-500'
                      }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{finding.rule_name}</p>
                        {severityBadge(finding.severity)}
                      </div>
                      {finding.description && <p className="text-sm text-slate-600 mt-1">{finding.description}</p>}
                      {finding.recommendation && (
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="font-medium">Recommendation:</span> {finding.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Images */}
        <Card>
          <CardHeader><CardTitle>Product images ({images.length})</CardTitle></CardHeader>
          <CardBody>
            {images.length === 0 ? (
              <EmptyState icon={<ImageIcon className="h-12 w-12" />} title="No images" description="No product images were uploaded for this inspection." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image) => (
                  <div key={image.id} className="rounded-lg overflow-hidden border border-slate-200">
                    <img src={getImageUrl(image.storage_path)} alt={image.file_name} className="h-40 w-full object-cover" />
                    <div className="p-2">
                      <p className="text-xs text-slate-500 truncate">{image.file_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Print-only footer */}
        <div className="hidden print:block text-xs text-slate-400 mt-8 pt-4 border-t border-slate-200">
          <p>Generated by MetriCheck Inspector on {new Date().toLocaleDateString()}</p>
          <p>Report ID: {inspection.id}</p>
          {report && <p>Report Number: {report.report_number}</p>}
        </div>
      </div>
    </AppLayout>
  );
}
