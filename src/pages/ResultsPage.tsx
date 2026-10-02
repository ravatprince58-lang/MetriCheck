import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Badge, EmptyState } from '@/components/ui/Badge';
import {
  ArrowRight,
  ArrowLeft,
  Scan,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import {
  getFieldLabel,
  isNotDetected,
  getNotDetectedMessage,
  FIELD_ORDER,
} from '@/lib/ocr';
import type {
  OcrResult,
  ExtractedField,
  InspectionImage,
  Inspection,
} from '@/types';

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ocrResults, setOcrResults] = useState<
    {
      ocrResult: OcrResult;
      fields: ExtractedField[];
    }[]
  >([]);

  const [images, setImages] = useState<InspectionImage[]>([]);
  const [inspection, setInspection] = useState<Inspection | null>(null);

  const [manualDetails, setManualDetails] = useState<
    Record<string, string>
  >({});

  const [editingField, setEditingField] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;

    setError(null);

    const [inspectionRes, ocrRes, imgRes] = await Promise.all([
      supabase
        .from('inspections')
        .select('*')
        .eq('id', id)
        .maybeSingle(),

      supabase
        .from('ocr_results')
        .select(`
      *,
      extracted_fields (
        id,
        ocr_result_id,
        field_name,
        field_value,
        confidence,
        created_at
      )
    `)
        .eq('inspection_id', id)
        .order('created_at', { ascending: true }),

      supabase
        .from('inspection_images')
        .select('*')
        .eq('inspection_id', id)
        .order('created_at', { ascending: true }),
    ]);

    if (inspectionRes.error) {
      setError('Could not load inspection details.');
      setLoading(false);
      return;
    }

    if (!inspectionRes.data) {
      setError('Inspection not found.');
      setLoading(false);
      return;
    }

    setInspection(inspectionRes.data as Inspection);

    setManualDetails(
      (inspectionRes.data.manual_details as Record<string, string>) || {}
    );

    if (ocrRes.error) {
      setError('Could not load OCR results.');
      setLoading(false);
      return;
    }

    if (imgRes.error) {
      setError('Could not load images.');
      setLoading(false);
      return;
    }

    setImages((imgRes.data as InspectionImage[]) || []);

    const ocrData =
      (ocrRes.data as (OcrResult & {
        extracted_fields: ExtractedField[];
      })[]) || [];

    /*
     * ------------------------------------------------------
     * Remove duplicate OCR records for the SAME image.
     * ------------------------------------------------------
     *
     * If the same image was scanned more than once and old
     * records somehow remain in the database, only the latest
     * OCR record for that image is displayed.
     *
     * Different images are still kept because they may contain
     * different sides of the same package.
     */
    const latestByImage = new Map<
      string,
      OcrResult & { extracted_fields: ExtractedField[] }
    >();

    for (const ocr of ocrData) {
      const imageId = String(ocr.image_id || '').trim();

      if (!imageId) {
        continue;
      }

      const existing = latestByImage.get(imageId);

      if (!existing) {
        latestByImage.set(imageId, ocr);
        continue;
      }

      const existingDate = new Date(
        existing.created_at || ''
      ).getTime();

      const currentDate = new Date(
        ocr.created_at || ''
      ).getTime();

      if (
        Number.isFinite(currentDate) &&
        (!Number.isFinite(existingDate) ||
          currentDate >= existingDate)
      ) {
        latestByImage.set(imageId, ocr);
      }
    }

    const loaded = Array.from(latestByImage.values()).map(
      (ocr) => ({
        ocrResult: ocr,
        fields: (ocr.extracted_fields || []) as ExtractedField[],
      })
    );

    setOcrResults(loaded);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    return data.publicUrl;
  };

  const getImageById = (imageId: string) => {
    return (
      images.find((img) => img.id === imageId) || null
    );
  };

  const startManualEdit = (
    fieldName: string,
    currentValue: string
  ) => {
    setEditingField(fieldName);
    setManualValue(
      manualDetails[fieldName] ||
      (isNotDetected(currentValue) ? '' : currentValue)
    );
    setError(null);
  };

  const cancelManualEdit = () => {
    setEditingField(null);
    setManualValue('');
  };

  const saveManualField = async (fieldName: string) => {
    if (!id) return;

    const value = manualValue.trim();

    if (!value) {
      setError('Please enter a value before saving.');
      return;
    }

    setSavingManual(true);
    setError(null);

    try {
      const updatedManualDetails = {
        ...manualDetails,
        [fieldName]: value,
      };

      const { error } = await supabase
        .from('inspections')
        .update({
          manual_details: updatedManualDetails,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      setManualDetails(updatedManualDetails);

      setInspection((prev) =>
        prev
          ? {
            ...prev,
            manual_details: updatedManualDetails,
          }
          : prev
      );

      setEditingField(null);
      setManualValue('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save manual value.'
      );
    } finally {
      setSavingManual(false);
    }
  };

  /*
   * ======================================================
   * MERGE PRODUCT DETAILS
   * ======================================================
   *
   * Multiple images may belong to the same physical package.
   *
   * Example:
   *
   * Image 1:
   *   Brand       = CRAX
   *   Product     = Rings
   *   MRP         = ₹10
   *
   * Image 2:
   *   Brand       = CRAX
   *   Product     = Rings
   *   Batch       = ABC123
   *
   * Final product:
   *   Brand       = CRAX
   *   Product     = Rings
   *   MRP         = ₹10
   *   Batch       = ABC123
   *
   * Brand/product are NOT displayed twice.
   * ======================================================
   */

  const fieldMap = new Map<string, ExtractedField>();

  for (const result of ocrResults) {
    for (const field of result.fields) {
      const fieldName = String(
        field.field_name || ''
      )
        .trim()
        .toLowerCase();

      if (!fieldName) {
        continue;
      }

      const fieldValue = String(
        field.field_value || ''
      ).trim();

      if (!fieldValue) {
        continue;
      }

      const existing = fieldMap.get(fieldName);

      /*
       * First detected value.
       */
      if (!existing) {
        fieldMap.set(fieldName, field);
        continue;
      }

      const existingValue = String(
        existing.field_value || ''
      ).trim();

      const currentIsDetected =
        !isNotDetected(fieldValue);

      const existingIsDetected =
        !isNotDetected(existingValue);

      /*
       * Prefer detected value over NOT_DETECTED.
       */
      if (
        !existingIsDetected &&
        currentIsDetected
      ) {
        fieldMap.set(fieldName, field);
        continue;
      }

      /*
       * If both values are detected, prefer the one
       * with higher confidence.
       */
      if (
        currentIsDetected &&
        existingIsDetected
      ) {
        const currentConfidence = Number(
          field.confidence || 0
        );

        const existingConfidence = Number(
          existing.confidence || 0
        );

        if (
          currentConfidence >
          existingConfidence
        ) {
          fieldMap.set(fieldName, field);
        }
      }
    }
  }

  /*
   * ======================================================
   * BUILD ONE FINAL PRODUCT FIELD LIST
   * ======================================================
   *
   * FIELD_ORDER controls the display order.
   *
   * IMPORTANT:
   * We create allFields ONLY ONCE.
   *
   * This fixes the previous bug where allFields was created
   * before the map was finished and then FIELD_ORDER fields
   * were pushed again.
   * ======================================================
   */

  const allFields: ExtractedField[] =
    FIELD_ORDER.map((fieldName) => {
      const normalizedName = String(
        fieldName || ''
      )
        .trim()
        .toLowerCase();

      const detected = fieldMap.get(
        normalizedName
      );

      if (detected) {
        return detected;
      }

      return {
        field_name: fieldName,
        field_value: '',
        confidence: 0,
      } as ExtractedField;
    });

  /*
   * ------------------------------------------------------
   * Include any additional fields returned by OCR that
   * are not part of FIELD_ORDER.
   *
   * This prevents real OCR fields from disappearing.
   * ------------------------------------------------------
   */

  const orderedFieldNames = new Set(
    FIELD_ORDER.map((name) =>
      String(name)
        .trim()
        .toLowerCase()
    )
  );

  for (const [fieldName, field] of fieldMap.entries()) {
    if (!orderedFieldNames.has(fieldName)) {
      allFields.push(field);
    }
  }

  /*
   * Final safety check:
   * one field_name can appear only once.
   */
  const uniqueFields = new Map<
    string,
    ExtractedField
  >();

  for (const field of allFields) {
    const key = String(
      field.field_name || ''
    )
      .trim()
      .toLowerCase();

    if (!key) {
      continue;
    }

    if (!uniqueFields.has(key)) {
      uniqueFields.set(key, field);
    }
  }

  const finalFields = Array.from(
    uniqueFields.values()
  );

  const detectedCount = finalFields.filter(
    (field) =>
      !isNotDetected(field.field_value)
  ).length;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Extracted product information
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          OCR-extracted package declarations from
          uploaded product images. Review the detected
          values before proceeding to compliance.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2 text-sm">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs">
            1
          </span>
          Product details
        </div>

        <div className="h-px flex-1 bg-slate-200 max-w-12" />

        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs">
            2
          </span>
          Image upload
        </div>

        <div className="h-px flex-1 bg-slate-200 max-w-12" />

        <div className="flex items-center gap-2 text-teal-600 font-medium">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white text-xs">
            3
          </span>
          OCR / Product info
        </div>

        <div className="h-px flex-1 bg-slate-200 max-w-12" />

        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">
            4
          </span>
          Compliance
        </div>

        <div className="h-px flex-1 bg-slate-200 max-w-12" />

        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">
            5
          </span>
          Verification
        </div>

        <div className="h-px flex-1 bg-slate-200 max-w-12" />

        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">
            6
          </span>
          Report
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error">
            {error}
          </Alert>
        </div>
      )}

      {loading ? (
        <div className="py-12">
          <Spinner />
        </div>
      ) : ocrResults.length === 0 ? (
        <Card className="mb-6">
          <CardBody>
            <EmptyState
              icon={
                <Scan className="h-12 w-12" />
              }
              title="No OCR results yet"
              description="Go back to the image upload page and run OCR on your uploaded package images to extract product information."
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-emerald-50 px-4 py-2.5 text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {detectedCount}
              </p>

              <p className="text-xs text-emerald-700">
                Fields detected
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 px-4 py-2.5 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {finalFields.length -
                  detectedCount}
              </p>

              <p className="text-xs text-amber-700">
                Not detected
              </p>
            </div>

            <div className="rounded-lg bg-sky-50 px-4 py-2.5 text-center">
              <p className="text-2xl font-bold text-sky-600">
                {ocrResults.length}
              </p>

              <p className="text-xs text-sky-700">
                Images processed
              </p>
            </div>
          </div>

          {/* Aggregated extracted fields */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />

                <CardTitle>
                  Extracted product information
                </CardTitle>
              </div>
            </CardHeader>

            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {finalFields.map((field) => {
                  const ocrNotDetected = isNotDetected(
                    field.field_value
                  );

                  const manualValueForField =
                    manualDetails[field.field_name] || '';

                  const hasManualValue =
                    manualValueForField.trim().length > 0;

                  const notDetected =
                    ocrNotDetected && !hasManualValue;

                  const displayedValue =
                    hasManualValue
                      ? manualValueForField
                      : field.field_value;

                  return (
                    <div
                      key={String(
                        field.field_name
                      )}
                      className="flex flex-col"
                    >
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                        {getFieldLabel(
                          field.field_name
                        )}
                      </span>

                      <div className="flex items-start gap-1.5 mt-0.5">
                        {notDetected ? (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        )}

                        <div className="flex flex-col w-full">
                          <span
                            className={`text-sm ${notDetected
                                ? 'text-slate-400 italic'
                                : 'text-slate-700 font-medium'
                              }`}
                          >
                            {notDetected
                              ? getNotDetectedMessage()
                              : displayedValue}
                          </span>

                          {!notDetected && (
                            <span className="mt-1 text-xs text-slate-400">
                              {hasManualValue
                                ? 'Manually entered by inspector'
                                : `OCR confidence: ${Math.round(
                                  field.confidence * 100
                                )}%`}
                            </span>
                          )}

                          {editingField === field.field_name ? (
                            <div className="mt-3 space-y-2">
                              <input
                                type="text"
                                value={manualValue}
                                onChange={(e) =>
                                  setManualValue(e.target.value)
                                }
                                placeholder={`Enter ${getFieldLabel(
                                  field.field_name
                                ).toLowerCase()}`}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                autoFocus
                              />

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    saveManualField(field.field_name)
                                  }
                                  loading={savingManual}
                                >
                                  Save
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelManualEdit}
                                  disabled={savingManual}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                startManualEdit(
                                  field.field_name,
                                  field.field_value
                                )
                              }
                              className="mt-2 w-fit text-xs font-medium text-teal-600 hover:text-teal-700"
                            >
                              {hasManualValue
                                ? 'Edit manually'
                                : 'Enter manually'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Per-image OCR results */}
          {ocrResults.map(
            (result, idx) => {
              const img = getImageById(
                result.ocrResult.image_id
              );

              const detected =
                result.fields.filter(
                  (field) =>
                    !isNotDetected(
                      field.field_value
                    )
                ).length;

              return (
                <Card
                  key={
                    result.ocrResult.id
                  }
                  className="mb-6"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scan className="h-5 w-5 text-teal-600" />

                        <CardTitle>
                          OCR Results — Image{' '}
                          {idx + 1}
                        </CardTitle>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            detected > 0
                              ? 'success'
                              : 'warning'
                          }
                        >
                          {detected}/
                          {result.fields.length}{' '}
                          fields detected
                        </Badge>

                        <Badge variant="info">
                          Confidence:{' '}
                          {
                            result
                              .ocrResult
                              .confidence
                          }
                          %
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardBody>
                    {img && (
                      <div className="mb-4">
                        <img
                          src={getImageUrl(
                            img.storage_path
                          )}
                          alt={
                            img.file_name
                          }
                          className="h-32 rounded-lg border border-slate-200 object-cover"
                        />
                      </div>
                    )}

                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 max-h-48 overflow-y-auto">
                      <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">
                        {result
                          .ocrResult
                          .raw_text ||
                          '(No text detected)'}
                      </pre>
                    </div>
                  </CardBody>
                </Card>
              );
            }
          )}
        </>
      )}

      {/* Link to compliance check */}
      <Card className="mb-6 border-teal-200">
        <CardBody>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-900">
                  Legal Metrology compliance check
                </p>

                <p className="text-xs text-slate-500 mt-0.5">
                  Run the database-driven rules
                  engine against OCR-extracted
                  package declarations.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  `/inspections/${id}/compliance`
                )
              }
            >
              Open compliance
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() =>
            navigate(
              `/inspections/${id}/upload`
            )
          }
        >
          <ArrowLeft className="h-4 w-4" />
          Back to images
        </Button>

        <Button
          onClick={() =>
            navigate(
              `/inspections/${id}/compliance`
            )
          }
        >
          Continue to compliance
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </AppLayout>
  );
}