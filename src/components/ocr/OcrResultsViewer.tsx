import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Scan, ChevronDown, ChevronUp, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { getFieldLabel, isNotDetected, getNotDetectedMessage } from '@/lib/ocr';
import type { OcrResult, ExtractedField } from '@/types';

interface OcrResultsViewerProps {
  results: { ocrResult: OcrResult; fields: ExtractedField[] }[];
  processing: boolean;
  progress: number;
  statusText: string;
}

export function OcrResultsViewer({ results, processing, progress, statusText }: OcrResultsViewerProps) {
  const [expandedRaw, setExpandedRaw] = useState<Record<string, boolean>>({});

  if (processing) {
    return (
      <Card className="mb-6 border-teal-200">
        <CardBody>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex items-center gap-3">
              <Scan className="h-6 w-6 text-teal-600 animate-pulse" />
              <span className="text-sm font-medium text-slate-700">{statusText || 'Processing...'}</span>
            </div>
            <div className="w-full max-w-md">
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500 text-center">{progress}%</p>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (results.length === 0) return null;

  const detectedCount = (fields: ExtractedField[]) =>
    fields.filter((f) => !isNotDetected(f.field_value)).length;

  return (
    <div className="space-y-4 mb-6">
      {results.map(({ ocrResult, fields }, idx) => {
        const detected = detectedCount(fields);
        const total = fields.length;
        const isExpanded = expandedRaw[ocrResult.id] || false;

        return (
          <Card key={ocrResult.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scan className="h-5 w-5 text-teal-600" />
                  <CardTitle>OCR Results — Image {idx + 1}</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={detected > 0 ? 'success' : 'warning'}>
                    {detected}/{total} fields detected
                  </Badge>
                  <Badge variant="info">Confidence: {ocrResult.confidence}%</Badge>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {/* Extracted fields grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-4">
                {fields.map((field) => {
                  const notDetected = isNotDetected(field.field_value);
                  return (
                    <div key={field.id || field.field_name} className="flex flex-col">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                        {getFieldLabel(field.field_name)}
                      </span>
                      <div className="flex items-start gap-1.5 mt-0.5">
                        {notDetected ? (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        )}
                        <span
                          className={`text-sm ${notDetected ? 'text-slate-400 italic' : 'text-slate-700 font-medium'}`}
                        >
                          {notDetected ? getNotDetectedMessage() : field.field_value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Raw text toggle */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setExpandedRaw((prev) => ({ ...prev, [ocrResult.id]: !prev[ocrResult.id] }))}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Raw OCR text
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {isExpanded && (
                  <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-4 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">
                      {ocrResult.raw_text || '(No text detected)'}
                    </pre>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
