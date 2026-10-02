import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/Badge';
import { OcrResultsViewer } from '@/components/ocr/OcrResultsViewer';
import { useOcr } from '@/hooks/useOcr';
import { ArrowRight, ArrowLeft, Upload, Trash2, ImageIcon, Scan } from 'lucide-react';
import type { InspectionImage } from '@/types';

export function ImageUploadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [images, setImages] = useState<InspectionImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [scanningImageId, setScanningImageId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const {
    processing,
    progress,
    statusText,
    error: ocrError,
    results,
    processImage,
    loadExistingResults,
    clearError,
  } = useOcr({ inspectionId: id || '' });

  const loadImages = useCallback(async () => {
    if (!id) return;
    const { data: inspectionData } = await supabase.from('inspections').select('status').eq('id', id).maybeSingle();
    setReadOnly(inspectionData?.status === 'completed');
    const { data, error } = await supabase
      .from('inspection_images')
      .select('*')
      .eq('inspection_id', id)
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setImages(data as InspectionImage[]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadImages();
    loadExistingResults();
  }, [loadImages, loadExistingResults]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !id) return;
    if (readOnly) return;
    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const duplicate = images.some((img) => img.file_name === file.name && img.file_size === file.size);
        if (duplicate) { setError(`Already uploaded: ${file.name}`); continue; }
        if (!file.type.startsWith('image/')) {
          setError('Only image files are allowed (JPG, JPEG, PNG, WEBP).');
          continue;
        }
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          setError('Unsupported file type. Please upload JPG, JPEG, PNG, or WEBP images.');
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          setError('Each image must be under 10 MB.');
          continue;
        }

        const filePath = `${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          setError(uploadError.message);
          continue;
        }

        const { data: imgRow, error: dbError } = await supabase
          .from('inspection_images')
          .insert({
            inspection_id: id,
            storage_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
          })
          .select()
          .single();

        if (dbError) {
          setError(dbError.message);
          continue;
        }

        const newImage = imgRow as InspectionImage;
        setImages((prev) => [newImage, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (image: InspectionImage) => {
    if (readOnly) return;
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([image.storage_path]);
    if (storageError) {
      setError(storageError.message);
      return;
    }
    const { error: dbError } = await supabase
      .from('inspection_images')
      .delete()
      .eq('id', image.id);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setImages((prev) => prev.filter((img) => img.id !== image.id));
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleScan = async (image: InspectionImage) => {
    if (readOnly) return;
    setScanningImageId(image.id);
    clearError();
    await processImage(image.storage_path, image.id);
    setScanningImageId(null);
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Product image upload & OCR</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload product package photos and run real OCR text extraction to identify product information.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2 text-sm">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs">1</span>
          Product details
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-teal-600 font-medium">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white text-xs">2</span>
          Image upload
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">3</span>
          OCR / Product info
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">4</span>
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

      {(error || ocrError) && (
        <div className="mb-4">
          <Alert variant="error">{error || ocrError}</Alert>
        </div>
      )}

      {readOnly && <div className="mb-6"><Alert variant="info" title="Read-only inspection">This inspection is completed. Images and OCR results can be viewed but not changed.</Alert></div>}

      {/* Upload zone */}
      <Card className="mb-6">
        <CardBody>
          <label
            htmlFor="file-upload"
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors ${
              dragActive ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'
            }`}
          >
            <input
              id="file-upload"
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={readOnly}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Spinner />
                <p className="text-sm text-slate-500">Uploading...</p>
              </div>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 mb-4">
                  <Upload className="h-6 w-6 text-teal-600" />
                </div>
                <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-400 mt-1">JPG, JPEG, PNG, WEBP up to 10 MB each</p>
              </>
            )}
          </label>
        </CardBody>
      </Card>

      {/* OCR processing progress */}
      {processing && (
        <OcrResultsViewer results={[]} processing={processing} progress={progress} statusText={statusText} />
      )}

      {/* OCR results */}
      {!processing && results.length > 0 && (
        <OcrResultsViewer results={results} processing={false} progress={0} statusText="" />
      )}

      {/* Uploaded images */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Uploaded images ({images.length})</CardTitle>
            {images.length > 0 && (
              <span className="text-xs text-slate-500">Click "Run OCR" to extract text from each image</span>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="py-12"><Spinner /></div>
          ) : images.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="h-12 w-12" />}
              title="No images uploaded yet"
              description="Upload product package photos to extract information using real OCR."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => {
                const hasOcr = results.some((r) => r.ocrResult.image_id === image.id);
                const isScanning = scanningImageId === image.id;
                return (
                  <div key={image.id} className="group relative rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={getImageUrl(image.storage_path)}
                      alt={image.file_name}
                      className="h-48 w-full object-cover"
                    />
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-slate-600 truncate">{image.file_name}</p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={hasOcr ? 'outline' : 'primary'}
                          onClick={() => handleScan(image)}
                          disabled={processing || isScanning}
                          loading={isScanning}
                          fullWidth
                        >
                          {!isScanning && <Scan className="h-3.5 w-3.5" />}
                          {hasOcr ? 'Re-run OCR' : 'Run OCR'}
                        </Button>
                        <button
                          onClick={() => handleDelete(image)}
                          className="flex-shrink-0 rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {hasOcr && (
                        <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <Scan className="h-3 w-3" /> OCR completed
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={() => navigate(`/inspections/${id}/results`)}>
          Continue to product info
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </AppLayout>
  );
}
