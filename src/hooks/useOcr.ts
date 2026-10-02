import { useState, useCallback } from 'react';
import { createWorker, PSM } from 'tesseract.js';
import { BrowserMultiFormatOneDReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { logAction } from '@/lib/audit';
import {
  buildAllFields,
  isNotDetected,
  isValidEAN13,
  isValidEAN8,
} from '@/lib/ocr';

import type {
  OcrResult,
  ExtractedField,
  InspectionImage,
} from '@/types';

interface UseOcrOptions {
  inspectionId: string;

  onComplete?: (
    result: OcrResult,
    fields: ExtractedField[]
  ) => void;
}

/*
 * Tesseract CDN configuration.
 *
 * IMPORTANT:
 * These are real URLs, NOT markdown links.
 */
const TESSERACT_WORKER_PATH =
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js';

const TESSERACT_CORE_PATH =
  'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core-simd.wasm.js';

const TESSERACT_LANG_PATH =
  'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0';

/* =========================================================
   IMAGE PREPROCESSING
   ========================================================= */

async function preprocessImage(
  blob: Blob,
  mode: 'color' | 'grayscale' | 'threshold' = 'grayscale'
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);

  try {
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;

    const maxDimension = 2600;

    const scale = Math.min(
      3,
      Math.max(
        1.5,
        maxDimension /
          Math.max(sourceWidth, sourceHeight)
      )
    );

    const width = Math.max(
      1,
      Math.round(sourceWidth * scale)
    );

    const height = Math.max(
      1,
      Math.round(sourceHeight * scale)
    );

    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
    });

    if (!ctx) {
      throw new Error(
        'Could not create image processing context.'
      );
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      bitmap,
      0,
      0,
      width,
      height
    );

    const imageData = ctx.getImageData(
      0,
      0,
      width,
      height
    );

    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      if (mode === 'color') {
        continue;
      }

      const gray = Math.round(
        0.299 * r +
        0.587 * g +
        0.114 * b
      );

      if (mode === 'threshold') {
        const value = gray < 165 ? 0 : 255;

        pixels[i] = value;
        pixels[i + 1] = value;
        pixels[i + 2] = value;
      } else {
        const contrast = 1.55;

        const adjusted = Math.round(
          (gray - 128) * contrast + 128
        );

        const value = Math.max(
          0,
          Math.min(255, adjusted)
        );

        pixels[i] = value;
        pixels[i + 1] = value;
        pixels[i + 2] = value;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const output = await new Promise<Blob | null>(
      (resolve) => {
        canvas.toBlob(
          resolve,
          'image/png',
          1
        );
      }
    );

    if (!output) {
      throw new Error(
        'Could not create processed OCR image.'
      );
    }

    return output;
  } finally {
    bitmap.close();
  }
}

/* =========================================================
   NUTRITION REGION PREPROCESSING
   ========================================================= */

async function preprocessNutritionRegion(
  blob: Blob
): Promise<Blob | null> {
  const imageUrl = URL.createObjectURL(blob);

  try {
    const image = new Image();

    await new Promise<void>(
      (resolve, reject) => {
        image.onload = () => resolve();

        image.onerror = () =>
          reject(
            new Error(
              'Could not load image for nutrition OCR.'
            )
          );

        image.src = imageUrl;
      }
    );

    if (
      !image.naturalWidth ||
      !image.naturalHeight
    ) {
      return null;
    }

    /*
     * Crop middle/lower area where nutrition
     * information is commonly located.
     */
    const sourceX =
      Math.floor(image.naturalWidth * 0.05);

    const sourceY =
      Math.floor(image.naturalHeight * 0.25);

    const sourceWidth =
      Math.floor(image.naturalWidth * 0.90);

    const sourceHeight =
      Math.floor(image.naturalHeight * 0.50);

    const scale = 4;

    const canvas =
      document.createElement('canvas');

    canvas.width =
      sourceWidth * scale;

    canvas.height =
      sourceHeight * scale;

    const ctx =
      canvas.getContext('2d', {
        willReadFrequently: true,
      });

    if (!ctx) {
      return null;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const imageData =
      ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

    for (
      let i = 0;
      i < imageData.data.length;
      i += 4
    ) {
      const r =
        imageData.data[i];

      const g =
        imageData.data[i + 1];

      const b =
        imageData.data[i + 2];

      const gray =
        0.299 * r +
        0.587 * g +
        0.114 * b;

      const contrast =
        Math.max(
          0,
          Math.min(
            255,
            (gray - 128) * 1.6 + 128
          )
        );

      imageData.data[i] =
        contrast;

      imageData.data[i + 1] =
        contrast;

      imageData.data[i + 2] =
        contrast;
    }

    ctx.putImageData(
      imageData,
      0,
      0
    );

    return await new Promise<Blob | null>(
      (resolve) => {
        canvas.toBlob(
          (result) => resolve(result),
          'image/png',
          1
        );
      }
    );
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

/* =========================================================
   BARCODE VALIDATION
   ========================================================= */

function isValidUPCA(
  value: string
): boolean {
  if (!/^\d{12}$/.test(value)) {
    return false;
  }

  const digits =
    value.split('').map(Number);

  let sum = 0;

  for (let i = 0; i < 11; i++) {
    sum +=
      digits[i] *
      (i % 2 === 0 ? 3 : 1);
  }

  const checkDigit =
    (10 - (sum % 10)) % 10;

  return (
    checkDigit ===
    digits[11]
  );
}

/* =========================================================
   BARCODE DETECTION
   ========================================================= */

async function decodeBarcode(
  blob: Blob
): Promise<string | null> {
  if (!blob) {
    return null;
  }

  const imageUrl =
    URL.createObjectURL(blob);

  try {
    const image = new Image();

    await new Promise<void>(
      (resolve, reject) => {
        image.onload = () => resolve();

        image.onerror = () =>
          reject(
            new Error(
              'Could not load image for barcode detection.'
            )
          );

        image.src = imageUrl;
      }
    );

    const width =
      image.naturalWidth;

    const height =
      image.naturalHeight;

    if (!width || !height) {
      console.log(
        '[Barcode] Invalid image dimensions.'
      );

      return null;
    }

    console.log(
      `[Barcode] Image size: ${width} x ${height}`
    );

    const hints = new Map();

    hints.set(
      DecodeHintType.POSSIBLE_FORMATS,
      [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ]
    );

    const reader =
      new BrowserMultiFormatOneDReader(
        hints
      );

    const validateResult = (
      result: any,
      source: string
    ): string | null => {
      if (!result) {
        return null;
      }

      const rawValue =
        result.getText();

      const value =
        rawValue.replace(
          /\D/g,
          ''
        );

      const format =
        result.getBarcodeFormat();

      console.log(
        `[Barcode] ${source} → raw:`,
        rawValue,
        'digits:',
        value,
        'format:',
        format
      );

      if (
        format ===
          BarcodeFormat.EAN_13 &&
        isValidEAN13(value)
      ) {
        console.log(
          '[Barcode] VALID EAN-13:',
          value
        );

        return value;
      }

      if (
        format ===
          BarcodeFormat.EAN_8 &&
        isValidEAN8(value)
      ) {
        console.log(
          '[Barcode] VALID EAN-8:',
          value
        );

        return value;
      }

      if (
        format ===
          BarcodeFormat.UPC_A &&
        isValidUPCA(value)
      ) {
        console.log(
          '[Barcode] VALID UPC-A:',
          value
        );

        return value;
      }

      if (
        format ===
          BarcodeFormat.UPC_E &&
        value.length === 8
      ) {
        console.log(
          '[Barcode] VALID UPC-E:',
          value
        );

        return value;
      }

      console.log(
        '[Barcode] Candidate rejected by validation.'
      );

      return null;
    };

    /* ---------------------------------------------
       1. Original image
       --------------------------------------------- */

    try {
      const result =
        await reader.decodeFromImageElement(
          image
        );

      const value =
        validateResult(
          result,
          'original image'
        );

      if (value) {
        return value;
      }
    } catch {
      console.log(
        '[Barcode] Original image: no barcode.'
      );
    }

    /* ---------------------------------------------
       2. Targeted regions
       --------------------------------------------- */

    const regions = [
      {
        name: 'lower-right',
        x: 0.45,
        y: 0.65,
        w: 0.55,
        h: 0.35,
      },
      {
        name: 'bottom-half',
        x: 0.20,
        y: 0.55,
        w: 0.80,
        h: 0.45,
      },
      {
        name: 'lower-center',
        x: 0.30,
        y: 0.60,
        w: 0.60,
        h: 0.35,
      },
      {
        name: 'full-lower',
        x: 0,
        y: 0.50,
        w: 1,
        h: 0.50,
      },
    ];

    for (const region of regions) {
      const sx =
        Math.floor(
          width * region.x
        );

      const sy =
        Math.floor(
          height * region.y
        );

      const sw =
        Math.floor(
          width * region.w
        );

      const sh =
        Math.floor(
          height * region.h
        );

      if (
        sw < 100 ||
        sh < 60
      ) {
        continue;
      }

      console.log(
        `[Barcode] Scanning region: ${region.name}`,
        {
          x: sx,
          y: sy,
          width: sw,
          height: sh,
        }
      );

      for (
        const scale of [3, 4, 5]
      ) {
        const canvas =
          document.createElement(
            'canvas'
          );

        canvas.width =
          sw * scale;

        canvas.height =
          sh * scale;

        const ctx =
          canvas.getContext(
            '2d',
            {
              willReadFrequently:
                true,
            }
          );

        if (!ctx) {
          continue;
        }

        ctx.imageSmoothingEnabled =
          false;

        ctx.drawImage(
          image,
          sx,
          sy,
          sw,
          sh,
          0,
          0,
          canvas.width,
          canvas.height
        );

        /* Original crop */

        try {
          const result =
            reader.decodeFromCanvas(
              canvas
            );

          const value =
            validateResult(
              result,
              `${region.name} scale ${scale} original`
            );

          if (value) {
            return value;
          }
        } catch {
          // Continue.
        }

        /* Thresholded crop */

        const imageData =
          ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );

        for (
          let i = 0;
          i < imageData.data.length;
          i += 4
        ) {
          const r =
            imageData.data[i];

          const g =
            imageData.data[i + 1];

          const b =
            imageData.data[i + 2];

          const gray =
            0.299 * r +
            0.587 * g +
            0.114 * b;

          const value =
            gray > 180
              ? 255
              : 0;

          imageData.data[i] =
            value;

          imageData.data[i + 1] =
            value;

          imageData.data[i + 2] =
            value;
        }

        ctx.putImageData(
          imageData,
          0,
          0
        );

        try {
          const result =
            reader.decodeFromCanvas(
              canvas
            );

          const value =
            validateResult(
              result,
              `${region.name} scale ${scale} threshold`
            );

          if (value) {
            return value;
          }
        } catch {
          console.log(
            `[Barcode] ${region.name} scale ${scale}: no decode`
          );
        }
      }
    }

    /* ---------------------------------------------
       3. Native BarcodeDetector
       --------------------------------------------- */

    if (
      'BarcodeDetector' in window
    ) {
      try {
        const Detector =
          (
            window as typeof window & {
              BarcodeDetector:
                new (
                  options?: {
                    formats?: string[];
                  }
                ) => {
                  detect(
                    source: CanvasImageSource
                  ): Promise<
                    Array<{
                      rawValue: string;
                      format: string;
                    }>
                  >;
                };
            }
          ).BarcodeDetector;

        const detector =
          new Detector({
            formats: [
              'ean_13',
              'ean_8',
              'upc_a',
              'upc_e',
            ],
          });

        const detected =
          await detector.detect(
            image
          );

        for (
          const result of detected
        ) {
          const value =
            result.rawValue.replace(
              /\D/g,
              ''
            );

          console.log(
            '[Barcode] Native detector:',
            value,
            result.format
          );

          if (
            result.format ===
              'ean_13' &&
            isValidEAN13(value)
          ) {
            return value;
          }

          if (
            result.format ===
              'ean_8' &&
            isValidEAN8(value)
          ) {
            return value;
          }

          if (
            result.format ===
              'upc_a' &&
            isValidUPCA(value)
          ) {
            return value;
          }

          if (
            result.format ===
              'upc_e' &&
            value.length === 8
          ) {
            return value;
          }
        }
      } catch (error) {
        console.log(
          '[Barcode] Native detector failed:',
          error
        );
      }
    }

    console.log(
      '[Barcode] No valid barcode detected.'
    );

    return null;
  } finally {
    URL.revokeObjectURL(
      imageUrl
    );
  }
}

/* =========================================================
   NUTRITION OCR RECONSTRUCTION
   ========================================================= */

function reconstructNutritionText(
  ocrResult: any
): string {
  const words =
    Array.isArray(
      ocrResult?.data?.words
    )
      ? ocrResult.data.words
      : [];

  if (words.length === 0) {
    return (
      ocrResult?.data?.text ||
      ''
    );
  }

  type NutritionWord = {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  };

  const usableWords =
    words
      .map(
        (word: any) => {
          const text =
            String(
              word?.text || ''
            ).trim();

          const bbox =
            word?.bbox;

          if (
            !text ||
            !bbox ||
            !Number.isFinite(
              bbox.x0
            ) ||
            !Number.isFinite(
              bbox.y0
            ) ||
            !Number.isFinite(
              bbox.x1
            ) ||
            !Number.isFinite(
              bbox.y1
            )
          ) {
            return null;
          }

          return {
            text,
            x: Number(
              bbox.x0
            ),
            y: Number(
              bbox.y0
            ),
            width: Math.max(
              1,
              Number(
                bbox.x1
              ) -
                Number(
                  bbox.x0
                )
            ),
            height: Math.max(
              1,
              Number(
                bbox.y1
              ) -
                Number(
                  bbox.y0
                )
            ),
            confidence:
              Number(
                word?.confidence ||
                  0
              ),
          };
        }
      )
      .filter(
        Boolean
      ) as NutritionWord[];

  if (
    usableWords.length === 0
  ) {
    return (
      ocrResult?.data?.text ||
      ''
    );
  }

  const filteredWords =
    usableWords.filter(
      (word) => {
        const value =
          word.text
            .replace(
              /[|]/g,
              ''
            )
            .trim();

        if (!value) {
          return false;
        }

        if (
          /^svg$/i.test(
            value
          )
        ) {
          return false;
        }

        return true;
      }
    );

  const rows:
    NutritionWord[][] = [];

  const sortedByY =
    [...filteredWords].sort(
      (a, b) => {
        const ay =
          a.y +
          a.height / 2;

        const by =
          b.y +
          b.height / 2;

        return ay - by;
      }
    );

  for (
    const word of sortedByY
  ) {
    const centerY =
      word.y +
      word.height / 2;

    let bestRow:
      NutritionWord[] | null =
      null;

    let bestDistance =
      Infinity;

    for (
      const row of rows
    ) {
      const rowCenterY =
        row.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.y +
            item.height / 2,
          0
        ) /
        row.length;

      const averageHeight =
        row.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.height,
          0
        ) /
        row.length;

      const tolerance =
        Math.max(
          8,
          Math.min(
            35,
            averageHeight *
              0.75
          )
        );

      const distance =
        Math.abs(
          centerY -
            rowCenterY
        );

      if (
        distance <=
          tolerance &&
        distance <
          bestDistance
      ) {
        bestDistance =
          distance;

        bestRow = row;
      }
    }

    if (bestRow) {
      bestRow.push(word);
    } else {
      rows.push([word]);
    }
  }

  const reconstructedRows =
    rows
      .map(
        (row) =>
          [...row]
            .sort(
              (a, b) =>
                a.x - b.x
            )
            .map(
              (word) =>
                word.text
            )
            .join(' ')
            .replace(
              /\s+/g,
              ' '
            )
            .trim()
      )
      .filter(Boolean);

  return reconstructedRows.join(
    '\n'
  );
}

/* =========================================================
   USE OCR HOOK
   ========================================================= */

export function useOcr({
  inspectionId,
  onComplete,
}: UseOcrOptions) {
  const [processing, setProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [statusText, setStatusText] =
    useState('');

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [results, setResults] =
    useState<
      {
        ocrResult: OcrResult;
        fields: ExtractedField[];
      }[]
    >([]);

  /* =======================================================
     PROCESS IMAGE
     ======================================================= */

  const processImage =
    useCallback(
      async (
        storagePath: string,
        imageId: string
      ): Promise<{
        ocrResult: OcrResult;
        fields: ExtractedField[];
      } | null> => {
        setProcessing(true);
        setError(null);
        setProgress(0);
        setStatusText(
          'Loading OCR engine...'
        );

        let worker:
          | Awaited<
              ReturnType<
                typeof createWorker
              >
            >
          | null = null;

        let phase =
          'worker';

        try {
          /* =========================================
             1. VERIFY IMAGE
             ========================================= */

          phase = 'image';

          const {
            data: imageRow,
            error:
              imageLookupError,
          } = await supabase
            .from(
              'inspection_images'
            )
            .select(
              'storage_path'
            )
            .eq(
              'id',
              imageId
            )
            .eq(
              'inspection_id',
              inspectionId
            )
            .maybeSingle();

          if (
            imageLookupError
          ) {
            throw new Error(
              imageLookupError.message
            );
          }

          if (
            !imageRow
          ) {
            throw new Error(
              'The selected image was not found.'
            );
          }

          if (
            imageRow.storage_path !==
            storagePath
          ) {
            throw new Error(
              'The selected image does not belong to this inspection.'
            );
          }

          /* =========================================
             2. DOWNLOAD REAL IMAGE
             ========================================= */

          setStatusText(
            'Loading image...'
          );

          setProgress(5);

          const {
            data: blobData,
            error:
              downloadError,
          } = await supabase.storage
            .from(
              STORAGE_BUCKET
            )
            .download(
              storagePath
            );

          if (
            downloadError
          ) {
            throw new Error(
              downloadError.message
            );
          }

          if (
            !blobData
          ) {
            throw new Error(
              'Could not download image from storage. Please try re-uploading the image.'
            );
          }

          const imageBlob =
            blobData as Blob;

          setProgress(8);

          /* =========================================
             3. PREPROCESS IMAGE
             ========================================= */

          phase =
            'preprocessing';

          setStatusText(
            'Preprocessing package image...'
          );

          const colorBlob =
            await preprocessImage(
              imageBlob,
              'color'
            );

          const grayscaleBlob =
            await preprocessImage(
              imageBlob,
              'grayscale'
            );

          const thresholdBlob =
            await preprocessImage(
              imageBlob,
              'threshold'
            );

          setProgress(12);

          /* =========================================
             4. CREATE TESSERACT WORKER
             ========================================= */

          phase =
            'worker';

          setStatusText(
            'Loading OCR engine...'
          );

          worker =
            await createWorker(
              'eng',
              1,
              {
                workerPath:
                  TESSERACT_WORKER_PATH,

                corePath:
                  TESSERACT_CORE_PATH,

                langPath:
                  TESSERACT_LANG_PATH,

                workerBlobURL:
                  true,

                logger: (
                  message
                ) => {
                  const status =
                    message.status;

                  const workerProgress =
                    Number(
                      message.progress ||
                        0
                    );

                  if (
                    status ===
                    'loading tesseract core'
                  ) {
                    phase =
                      'core';

                    setStatusText(
                      'Loading OCR engine...'
                    );

                    setProgress(
                      Math.round(
                        5 +
                          workerProgress *
                            5
                      )
                    );
                  } else if (
                    status ===
                    'loading language traineddata'
                  ) {
                    phase =
                      'language';

                    setStatusText(
                      'Loading language data...'
                    );

                    setProgress(
                      Math.round(
                        10 +
                          workerProgress *
                            5
                      )
                    );
                  } else if (
                    status ===
                    'recognizing text'
                  ) {
                    phase =
                      'recognition';

                    setStatusText(
                      'Processing image...'
                    );

                    setProgress(
                      Math.min(
                        90,
                        Math.round(
                          10 +
                            workerProgress *
                              80
                        )
                      )
                    );
                  }
                },
              }
            );

          /* =========================================
             5. OCR HELPER
             ========================================= */

          phase =
            'recognition';

          const recognizePass =
            async (
              blob: Blob,
              pageSegMode: PSM
            ) => {
              if (!worker) {
                throw new Error(
                  'OCR worker is not initialized.'
                );
              }

              await worker.setParameters(
                {
                  tessedit_pageseg_mode:
                    pageSegMode,
                }
              );

              return worker.recognize(
                blob
              );
            };

          /* =========================================
             6. OCR PASSES
             ========================================= */

          setStatusText(
            'Reading package text...'
          );

          const ocrResults:
            any[] = [];

          /* PASS 1 */

          ocrResults.push(
            await recognizePass(
              colorBlob,
              PSM.SPARSE_TEXT
            )
          );

          setProgress(35);

          /* PASS 2 */

          ocrResults.push(
            await recognizePass(
              grayscaleBlob,
              PSM.SPARSE_TEXT
            )
          );

          setProgress(60);

          /* PASS 3 */

          ocrResults.push(
            await recognizePass(
              thresholdBlob,
              PSM.SINGLE_BLOCK
            )
          );

          setProgress(78);

          /* =========================================
             7. NUTRITION OCR
             ========================================= */

          const nutritionBlob =
            await preprocessNutritionRegion(
              imageBlob
            );

          if (
            nutritionBlob
          ) {
            const nutritionOcr =
              await recognizePass(
                nutritionBlob,
                PSM.SINGLE_BLOCK
              );

            const reconstructedNutrition =
              reconstructNutritionText(
                nutritionOcr
              );

            console.log(
              '===== NUTRITION OCR RAW ====='
            );

            console.log(
              nutritionOcr.data.text
            );

            console.log(
              '============================='
            );

            console.log(
              '===== NUTRITION OCR RECONSTRUCTED ====='
            );

            console.log(
              reconstructedNutrition
            );

            console.log(
              '========================================'
            );

            const nutritionResultForExtraction =
              {
                ...nutritionOcr,

                data: {
                  ...nutritionOcr.data,

                  text:
                    reconstructedNutrition,
                },
              };

            ocrResults.push(
              nutritionResultForExtraction
            );
          }

          setProgress(82);

          /* =========================================
             8. MERGE OCR TEXT
             ========================================= */

          const uniqueLines =
            new Set<string>();

          for (
            const result of ocrResults
          ) {
            const text =
              result?.data?.text ||
              '';

            for (
              const line of text.split(
                /\r?\n/
              )
            ) {
              const cleaned =
                line.trim();

              if (
                cleaned.length >=
                2
              ) {
                uniqueLines.add(
                  cleaned
                );
              }
            }
          }

          let rawText =
            Array.from(
              uniqueLines
            )
              .join('\n')
              .trim();

          console.log(
            '===== RAW OCR TEXT ====='
          );

          console.log(
            rawText
          );

          console.log(
            '========================'
          );

          /* =========================================
             9. BARCODE
             ========================================= */

          setStatusText(
            'Detecting barcode...'
          );

          const barcode =
            await decodeBarcode(
              imageBlob
            );

          console.log(
            '===== ZXING BARCODE ====='
          );

          console.log(
            barcode
          );

          console.log(
            '========================'
          );

          if (barcode) {
            rawText +=
              `\nBARCODE: ${barcode}`;
          }

          /* =========================================
             10. OCR CONFIDENCE
             ========================================= */

          const confidences =
            ocrResults
              .map(
                (result) =>
                  Number(
                    result?.data
                      ?.confidence ||
                      0
                  )
              )
              .filter(
                (value) =>
                  Number.isFinite(
                    value
                  )
              );

          const confidence =
            confidences.length > 0
              ? Math.round(
                  confidences.reduce(
                    (
                      sum,
                      value
                    ) =>
                      sum + value,
                    0
                  ) /
                    confidences.length
                )
              : 0;

          /* =========================================
             11. EXTRACT FIELDS
             ========================================= */

          setStatusText(
            'Extracting product information...'
          );

          setProgress(92);

          const parsedFields =
            buildAllFields(
              rawText
            );

          /* =========================================
             12. FIND PREVIOUS OCR
             ========================================= */

          phase =
            'database';

          const {
            data: previousOcr,
            error:
              previousOcrError,
          } = await supabase
            .from(
              'ocr_results'
            )
            .select('id')
            .eq(
              'inspection_id',
              inspectionId
            )
            .eq(
              'image_id',
              imageId
            )
            .maybeSingle();

          if (
            previousOcrError
          ) {
            throw new Error(
              'Could not check previous OCR result: ' +
                previousOcrError.message
            );
          }

          /* =========================================
             13. DELETE OLD OCR DATA
             ========================================= */

          if (
            previousOcr?.id
          ) {
            const {
              error:
                deleteFieldsError,
            } = await supabase
              .from(
                'extracted_fields'
              )
              .delete()
              .eq(
                'ocr_result_id',
                previousOcr.id
              );

            if (
              deleteFieldsError
            ) {
              throw new Error(
                'Could not remove previous extracted fields: ' +
                  deleteFieldsError.message
              );
            }

            const {
              error:
                deleteOcrError,
            } = await supabase
              .from(
                'ocr_results'
              )
              .delete()
              .eq(
                'id',
                previousOcr.id
              );

            if (
              deleteOcrError
            ) {
              throw new Error(
                'Could not remove previous OCR result: ' +
                  deleteOcrError.message
              );
            }
          }

          /* =========================================
             14. SAVE NEW OCR RESULT
             ========================================= */

          const {
            data: ocrRow,
            error: insertOcrError,
          } = await supabase
            .from(
              'ocr_results'
            )
            .insert({
              image_id:
                imageId,

              inspection_id:
                inspectionId,

              raw_text:
                rawText,

              confidence:
                confidence,

              status:
                'completed',

              processed_at:
                new Date().toISOString(),
            })
            .select()
            .single();

          if (
            insertOcrError
          ) {
            throw new Error(
              'Could not save OCR result to database: ' +
                insertOcrError.message
            );
          }

          if (
            !ocrRow
          ) {
            throw new Error(
              'OCR result was not returned by the database.'
            );
          }

          /*
           * IMPORTANT:
           * Only ONE declaration of ocrResult.
           */
          const ocrResult =
            ocrRow as OcrResult;

          /* =========================================
             15. SAVE EXTRACTED FIELDS
             ========================================= */

          const fieldRows =
            parsedFields.map(
              (field) => ({
                ocr_result_id:
                  ocrResult.id,

                field_name:
                  field.field_name,

                field_value:
                  field.field_value,

                confidence:
                  field.confidence,
              })
            );

          let extractedFields:
            ExtractedField[] =
            [];

          /*
           * Only insert when fields actually exist.
           * This prevents an empty insert request.
           */
          if (
            fieldRows.length > 0
          ) {
            const {
              data: savedFields,
              error:
                fieldsError,
            } = await supabase
              .from(
                'extracted_fields'
              )
              .insert(
                fieldRows
              )
              .select();

            if (
              fieldsError
            ) {
              throw new Error(
                'OCR completed, but saving extracted fields failed: ' +
                  fieldsError.message
              );
            }

            extractedFields =
              (
                savedFields ||
                []
              ) as ExtractedField[];
          }

          /* =========================================
             16. COMPLETE
             ========================================= */

          setProgress(100);

          setStatusText(
            'OCR completed'
          );

          await logAction(
            'ocr_processed',
            'inspection',
            inspectionId,
            {
              image_id:
                imageId,

              fields_detected:
                parsedFields.filter(
                  (field) =>
                    !isNotDetected(
                      field.field_value
                    )
                ).length,

              confidence:
                confidence,
            }
          );

          const resultPair = {
            ocrResult:
              ocrResult,

            fields:
              extractedFields,
          };

          /*
           * Replace existing result for this image
           * instead of continuously adding duplicates.
           */
          setResults(
            (previous) => {
              const withoutCurrent =
                previous.filter(
                  (item) =>
                    item.ocrResult
                      .image_id !==
                    imageId
                );

              return [
                ...withoutCurrent,
                resultPair,
              ];
            }
          );

          onComplete?.(
            ocrResult,
            extractedFields
          );

          setProcessing(false);

          return resultPair;
        } catch (err) {
          /* =========================================
             ERROR HANDLING
             ========================================= */

          const message =
            err instanceof Error
              ? err.message
              : String(err);

          let errorPrefix =
            'OCR processing failed';

          if (
            phase === 'core'
          ) {
            errorPrefix =
              'OCR core loading failed';
          } else if (
            phase === 'language'
          ) {
            errorPrefix =
              'OCR language loading failed';
          } else if (
            phase === 'recognition'
          ) {
            errorPrefix =
              'OCR recognition failed';
          } else if (
            phase === 'database'
          ) {
            errorPrefix =
              'OCR completed, but saving the OCR result failed';
          } else if (
            phase === 'worker'
          ) {
            errorPrefix =
              'OCR worker initialization failed';
          } else if (
            phase === 'image'
          ) {
            errorPrefix =
              'OCR image loading failed';
          } else if (
            phase === 'preprocessing'
          ) {
            errorPrefix =
              'OCR image preprocessing failed';
          }

          const displayMessage =
            `${errorPrefix}: ${message}`;

          console.error(
            '[OCR ERROR]',
            err
          );

          setError(
            displayMessage
          );

          setProcessing(false);
          setProgress(0);
          setStatusText(
            'OCR failed'
          );

          return null;
        } finally {
          /* =========================================
             ALWAYS TERMINATE WORKER
             ========================================= */

          if (worker) {
            try {
              await worker.terminate();
            } catch (
              terminationError
            ) {
              console.warn(
                '[OCR] Worker termination failed:',
                terminationError
              );
            }
          }
        }
      },
      [
        inspectionId,
        onComplete,
      ]
    );

  /* =======================================================
     LOAD EXISTING RESULTS
     ======================================================= */

  const loadExistingResults =
    useCallback(
      async () => {
        if (!inspectionId) {
          setResults([]);
          return;
        }

        const {
          data: ocrData,
          error: ocrErr,
        } = await supabase
          .from(
            'ocr_results'
          )
          .select('*')
          .eq(
            'inspection_id',
            inspectionId
          )
          .order(
            'created_at',
            {
              ascending: true,
            }
          );

        if (
          ocrErr
        ) {
          console.error(
            '[OCR] Failed to load OCR results:',
            ocrErr
          );

          return;
        }

        if (
          !ocrData
        ) {
          setResults([]);
          return;
        }

        const loaded:
          {
            ocrResult: OcrResult;
            fields: ExtractedField[];
          }[] = [];

        /*
         * Use a Set so that only one OCR result
         * exists for each image.
         */
        const processedImageIds =
          new Set<string>();

        for (
          const ocr of
            ocrData as OcrResult[]
        ) {
          /*
           * If duplicate OCR rows somehow exist,
           * don't load duplicate UI results.
           */
          if (
            processedImageIds.has(
              ocr.image_id
            )
          ) {
            continue;
          }

          processedImageIds.add(
            ocr.image_id
          );

          const {
            data: fieldData,
            error:
              fieldError,
          } = await supabase
            .from(
              'extracted_fields'
            )
            .select('*')
            .eq(
              'ocr_result_id',
              ocr.id
            )
            .order(
              'created_at',
              {
                ascending: true,
              }
            );

          if (
            fieldError
          ) {
            console.error(
              '[OCR] Failed to load extracted fields:',
              fieldError
            );
          }

          loaded.push({
            ocrResult:
              ocr,

            fields:
              (
                fieldData ||
                []
              ) as ExtractedField[],
          });
        }

        setResults(
          loaded
        );
      },
      [inspectionId]
    );

  /* =======================================================
     CLEAR ERROR
     ======================================================= */

  const clearError =
    useCallback(
      () => {
        setError(null);
      },
      []
    );

  /* =======================================================
     RETURN
     ======================================================= */

  return {
    processing,
    progress,
    statusText,
    error,
    results,
    processImage,
    loadExistingResults,
    clearError,
  };
}