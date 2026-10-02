import type { ExtractedField, OcrResult } from '@/types';

export interface OcrProgressInfo {
  status: string;
  progress: number;
}

export interface OcrProcessResult {
  rawText: string;
  confidence: number;
  extractedFields: ParsedField[];
}

export interface ParsedField {
  field_name: string;
  field_value: string;
  confidence: number;
}

const FIELD_LABELS: Record<string, string> = {
  brand: 'Brand',
  product_name: 'Product Name',
  net_quantity: 'Net Quantity',
  mrp: 'MRP (Maximum Retail Price)',
  batch_number: 'Batch / Lot Number',
  manufacturer: 'Manufacturer / Packer / Importer',
  address: 'Address',
  manufacturing_date: 'Manufacturing / Packing Date',
  best_before: 'Best Before / Use By',
  consumer_care: 'Consumer Care Details',
  ingredients: 'Ingredients',
  nutrition: 'Nutrition Information',
  fssai_number: 'FSSAI Number',
  country_of_origin: 'Country of Origin',
  barcode: 'Barcode',
};

export const FIELD_ORDER = Object.keys(FIELD_LABELS);

export function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key;
}

const NOT_DETECTED = 'Not detected — Manual verification required.';

export function getNotDetectedMessage(): string {
  return NOT_DETECTED;
}

export function isNotDetected(value: string): boolean {
  return !value || value.trim() === '' || value === NOT_DETECTED;
}

function cleanLine(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/[|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * OCR frequently removes spaces from declaration labels or confuses punctuation.
 * We normalize only labels/spacing; we deliberately do NOT "correct" legal values.
 */
function normalizeOcrText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((raw) => {
      let line = cleanLine(raw);
      if (!line) return '';

      line = line
        .replace(/\bBATCH\s*NO\s*\.?\s*:?/gi, 'BATCH NO: ')
        .replace(/\bBATCHNO\s*\.?\s*:?/gi, 'BATCH NO: ')
        .replace(
          /\bDATE\s*OF\s*MANUFACTURE\s*:?/gi,
          'DATE OF MANUFACTURE: '
        )
        .replace(/\bMANUFACTURED\s*BY\s*:?/gi, 'MANUFACTURED BY: ')
        .replace(/\bPACKED\s*BY\s*:?/gi, 'PACKED BY: ')
        .replace(/\bMARKETED\s*BY\s*:?/gi, 'MARKETED BY: ')
        .replace(/\bNET\s*QUANTITY\s*:?/gi, 'NET QUANTITY: ')
        .replace(/\bNET\s*WEIGHT\s*:?/gi, 'NET WEIGHT: ')
        .replace(/\bNET\s*WT\.?\s*:?/gi, 'NET WT: ')
        .replace(/\bMRP\s*:?/gi, 'MRP: ')
        .replace(/\bUSE\s*BY\s*:?/gi, 'USE BY: ')
        .replace(/\bBEST\s*BEFORE\s*:?/gi, 'BEST BEFORE: ')
        .replace(/\bF\.??S\.??S\.??A\.??I\.??\s*/gi, 'FSSAI ')
        .replace(
          /\bLIC(?:ENCE|ENSE)?\.?\s*NO\.?\s*:?/gi,
          'LIC NO: '
        )
        .replace(
          /\bCONSUMER\s*FEEDBACK\s*:?/gi,
          'CONSUMER FEEDBACK: '
        )
        .replace(
          /\bCONSUMER\s*SERVICES?\s*MANAGER\s*:?/gi,
          'CONSUMER SERVICES MANAGER: '
        )
        .replace(/\bINGREDIENTS\s*[:;\-]?/gi, 'INGREDIENTS: ')
        .replace(
          /\bNUTRITIONAL\s+INFORMATION\s*[:;\-]?/gi,
          'NUTRITIONAL INFORMATION: '
        )
        .replace(
          /\bNUTRITION\s+INFORMATION\s*[:;\-]?/gi,
          'NUTRITION INFORMATION: '
        )
        // ---------------------------------------------------------
        // FIX: normalize Country-of-Origin style labels the same
        // way every other declaration label above is normalized.
        // Real packages phrase this many different ways, and OCR
        // frequently drops the space between words:
        //   "Country of Origin", "COUNTRYOF ORIGIN", "Country of
        //   Orgin" (missing an i), "COO", "Made in India",
        //   "Product of India". We fold all of these down to one
        //   canonical "COUNTRY OF ORIGIN: " prefix so the extractor
        //   below only has to look for one pattern.
        // \s* (not \s+) between words so merged OCR words like
        // "COUNTRYOF" still match.
        // ---------------------------------------------------------
        .replace(
          /\bCOUNTRY\s*OF\s*(?:ORIGIN|ORGIN|ORIGIIN)\b\s*[:\-]?/gi,
          'COUNTRY OF ORIGIN: '
        )
        .replace(/\bCOO\b\s*[:\-]?/g, 'COUNTRY OF ORIGIN: ')
        .replace(/\bORIGIN\s*COUNTRY\b\s*[:\-]?/gi, 'COUNTRY OF ORIGIN: ')
        .replace(/\bPRODUCT\s*OF\b\s*[:\-]?/gi, 'PRODUCT OF: ')
        .replace(/\bMADE\s*IN\b\s*[:\-]?/gi, 'MADE IN: ');

      return cleanLine(line);
    })
    .filter(Boolean)
    .join('\n');
}

function linesOf(text: string): string[] {
  return normalizeOcrText(text)
    .split('\n')
    .map(cleanLine)
    .filter(Boolean);
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      const value = cleanLine(match[1]);

      if (value.length >= 1 && value.length <= 600) {
        return value;
      }
    }
  }

  return null;
}

function lineIndex(lines: string[], pattern: RegExp): number {
  return lines.findIndex((line) => pattern.test(line));
}

function section(
  lines: string[],
  startPattern: RegExp,
  endPatterns: RegExp[],
  maxLines = 12
): string | null {
  const start = lineIndex(lines, startPattern);

  if (start < 0) return null;

  const values: string[] = [];

  const first = lines[start]
    .replace(startPattern, '')
    .replace(/^[:;\-]+/, '')
    .trim();

  if (first) {
    values.push(first);
  }

  for (
    let i = start + 1;
    i < Math.min(lines.length, start + 1 + maxLines);
    i += 1
  ) {
    const line = lines[i];

    if (endPatterns.some((pattern) => pattern.test(line))) {
      break;
    }

    values.push(line);
  }

  const result = cleanLine(values.join(' '));

  return result.length >= 3 ? result : null;
}

function isLikelyDeclaration(line: string): boolean {
  return /^(ingredients|nutrition|nutritional|net|mrp|batch|mfg|manufact|packed|marketed|address|consumer|fssai|lic|country|made in|best before|use by|expiry|barcode|ean|gtin|energy|protein|carbohydrate|total|saturated|trans|sodium|sugar|fat|fiber|serving)/i.test(
    line
  );
}

/* =========================================================
   BRAND
   ========================================================= */

function isBrandNoise(value: string): boolean {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const noise = new Set([
    'keep',
    'keep away',
    'keep away from direct sunlight',
    'your city',
    'clean',
    'store',
    'store in a cool dry',
    'cool',
    'dry',
    'hygienic',
    'sunlight',
    'direct sunlight',

    'real',
    'taste',
    'classic',

    'pot',
    'potato',
    'potatoes',
    'chips',

    'cream',
    'onion',
    'sour',
    'flavour',
    'flavor',
    'masala',

    'food',
    'foods',

    'ingredients',
    'nutrition',
    'nutritional',
    'energy',
    'protein',
    'carbohydrate',
    'sodium',
    'sugar',
    'fat',

    'free',
    'gluten',
    'gluten free',
    'preservatives',
    'no added preservatives',
  ]);

  return noise.has(normalized);
}

function extractBrand(text: string): string | null {
  if (!text) return null;

  const lines = linesOf(text);

  // ---------------------------------------------------------
  // 1. Explicit BRAND label
  // ---------------------------------------------------------
  const labeledMatch = text.match(
    /(?:^|\n)\s*BRAND\s*[:\-]\s*(.+)$/im
  );

  if (labeledMatch?.[1]) {
    const value = cleanLine(labeledMatch[1]);

    if (
      value &&
      value.length <= 60 &&
      !isLikelyDeclaration(value) &&
      !isBrandNoise(value)
    ) {
      return value;
    }
  }

  // ---------------------------------------------------------
  // 2. Manufacturer evidence
  // Example:
  // MANUFACTURED BY:
  // TastyBite Foods Pvt. Ltd.
  //
  // Candidate = TastyBite
  // ---------------------------------------------------------
  const manufacturerMatch = text.match(
    /MANUFACTURED\s+BY\s*:?\s*(?:\n\s*)?([A-Za-z][A-Za-z0-9&.\- ]{2,80})/i
  );

  if (manufacturerMatch?.[1]) {
    const manufacturerLine = cleanLine(
      manufacturerMatch[1]
    );

    const firstWord = manufacturerLine
      .split(/\s+/)[0]
      ?.replace(/[^A-Za-z0-9&]/g, '')
      .trim();

    if (
      firstWord &&
      firstWord.length >= 4 &&
      !isBrandNoise(firstWord)
    ) {
      const escaped = firstWord.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

      const tokenRegex = new RegExp(
        `\\b${escaped}[A-Za-z0-9&-]*\\b`,
        'i'
      );

      const matches: string[] = [];

      for (const line of lines) {
        const match = line.match(tokenRegex);

        if (
          match?.[0] &&
          !isBrandNoise(match[0])
        ) {
          matches.push(match[0]);
        }
      }

      if (matches.length > 0) {
        return matches.sort(
          (a, b) => b.length - a.length
        )[0];
      }

      return firstWord;
    }
  }

  // ---------------------------------------------------------
  // 3. General OCR candidates
  // ---------------------------------------------------------
  const candidates = lines
    .map((line) => cleanLine(line))
    .filter((line) => {
      if (line.length < 3 || line.length > 40) {
        return false;
      }

      if (isLikelyDeclaration(line)) {
        return false;
      }

      if (isBrandNoise(line)) {
        return false;
      }

      if (/\d/.test(line)) {
        return false;
      }

      if (/[₹$€£¥]/.test(line)) {
        return false;
      }

      // Never use manufacturer/company information as brand.
      if (
        /\b(?:pvt\.?|private|ltd\.?|limited|foods?|industries|company|corporation|manufacturer|manufactured|packer|importer)\b/i.test(
          line
        )
      ) {
        return false;
      }

      // Reject generic food/package words.
      if (
        /\b(?:potato|potatoes|chips|cream|onion|flavour|flavor|masala|biscuit|biscuits|noodles|pasta|rice|flour|atta|spice|ingredients|nutrition|energy|protein|carbohydrate|sodium|sugar|fat)\b/i.test(
          line
        )
      ) {
        return false;
      }

      const letters =
        (line.match(/[A-Za-z]/g) || []).length;

      return (
        letters >= 3 &&
        letters / line.length > 0.65
      );
    });

  // ---------------------------------------------------------
  // 4. Prefer repeated OCR candidates
  // ---------------------------------------------------------
  const frequency = new Map<string, number>();

  for (const candidate of candidates) {
    const key = candidate.toLowerCase();

    frequency.set(
      key,
      (frequency.get(key) || 0) + 1
    );
  }

  const repeated = candidates
    .filter(
      (candidate) =>
        (frequency.get(
          candidate.toLowerCase()
        ) || 0) >= 2
    )
    .sort((a, b) => {
      const frequencyDifference =
        (frequency.get(b.toLowerCase()) || 0) -
        (frequency.get(a.toLowerCase()) || 0);

      if (frequencyDifference !== 0) {
        return frequencyDifference;
      }

      return b.length - a.length;
    });

  if (repeated.length > 0) {
    return repeated[0];
  }
  return candidates[0] ?? null;
}


/* =========================================================
   PRODUCT NAME
   ========================================================= */

function extractProductName(text: string): string | null {
  if (!text) return null;

  const lines = linesOf(text)
    .map(cleanLine)
    .filter(Boolean);

  /* ---------------------------------------------------------
     Helpers
     --------------------------------------------------------- */

  const blockedWords = [
    'ingredients',
    'nutrition',
    'energy',
    'protein',
    'carbohydrate',
    'sugar',
    'fat',
    'sodium',
    'fssai',
    'lic',
    'manufactured',
    'manufacture',
    'manufacturer',
    'packer',
    'importer',
    'batch',
    'mrp',
    'net quantity',
    'net weight',
    'net wt',
    'unit sale price',
    'consumer care',
    'customer care',
    'address',
    'keep',
    'store',
    'sunlight',
    'preservatives',
    'flavouring substances',
    'anticaking agent',
    'acidity regulator',
    'per 100 g',
    'per 100g',
    'date of manufacture',
    'use by',
    'best before',
    'country of origin',
  ];

  const marketingPatterns = [
    /^your\s+city$/i,
    /^no\s+added(?:\s+.*)?$/i,
    /^real(?:\s+.*)?$/i,
    /^taste$/i,
    /^free$/i,
    /^fresh$/i,
    /^quality$/i,
    /^premium$/i,
    /^healthy$/i,
    /^natural$/i,
    /^gluten\s+free$/i,
    /^made\s+with/i,
    /^keep\s+away/i,
    /^store\s+in/i,
    /^for\s+feedback/i,
    /^clean$/i,
    /^hygienic$/i,
  ];

  const productTerms = [
    'chips',
    'biscuit',
    'biscuits',
    'cookie',
    'cookies',
    'namkeen',
    'snack',
    'noodles',
    'pasta',
    'rice',
    'flour',
    'atta',
    'masala',
    'spice',
    'spices',
    'juice',
    'drink',
    'beverage',
    'oil',
    'sauce',
    'ketchup',
    'pickle',
    'papad',
    'wafer',
    'wafers',
    'cereal',
    'oats',
    'bread',
    'chocolate',
    'candy',
    'toffee',
    'milk',
    'tea',
    'coffee',
  ];

  const isBlocked = (line: string): boolean => {
    const lower = line.toLowerCase();

    return blockedWords.some((word) =>
      lower.includes(word)
    );
  };

  const isMarketingText = (line: string): boolean => {
    return marketingPatterns.some((pattern) =>
      pattern.test(line.trim())
    );
  };

  const hasProductTerm = (line: string): boolean => {
    const lower = line.toLowerCase();

    return productTerms.some((term) =>
      new RegExp(`\\b${term}\\b`, 'i').test(lower)
    );
  };

  /*
   * OCR sometimes separates a word:
   *
   * Cl
   * assiC
   *
   * or:
   *
   * C
   * lass
   * ic
   *
   * Join very small alphabetic fragments when they
   * clearly form one word.
   */
  const repairFragments = (value: string): string => {
    let result = value
      .replace(/\s+/g, ' ')
      .trim();

    /*
     * Example:
     * "Cl assiC" -> "Classic"
     *
     * Only repair when the first/second fragments are
     * very short. This avoids joining normal words.
     */
    result = result.replace(
      /\b([A-Za-z]{1,2})\s+([A-Za-z]{3,6})\b/g,
      (full, first, second) => {
        const joined = `${first}${second}`;

        if (joined.length <= 8) {
          return joined;
        }

        return full;
      }
    );

    return result;
  };

  const cleanProductText = (value: string): string => {
    return repairFragments(
      value
        .replace(/[|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  };

  /* ---------------------------------------------------------
     1. Explicit PRODUCT NAME label
     --------------------------------------------------------- */

  const labelledMatch = text.match(
    /(?:PRODUCT\s+NAME|PRODUCT\s+TITLE)\s*[:\-]\s*([^\n]+)/i
  );

  if (labelledMatch?.[1]) {
    const value = cleanProductText(labelledMatch[1]);

    if (
      value.length >= 2 &&
      value.length <= 100 &&
      !isBlocked(value) &&
      !isMarketingText(value)
    ) {
      return value;
    }
  }

  /* ---------------------------------------------------------
     2. Build clean OCR candidates
     --------------------------------------------------------- */

  const candidates = lines
    .map((line, index) => ({
      line: cleanProductText(line),
      index,
    }))
    .filter(({ line }) => {
      if (line.length < 2 || line.length > 50) {
        return false;
      }

      if (isBlocked(line)) {
        return false;
      }

      if (isMarketingText(line)) {
        return false;
      }

      if (/[₹$€£¥]/.test(line)) {
        return false;
      }

      if (
        /^\d+(?:\.\d+)?\s*(?:g|kg|mg|ml|l)$/i.test(line)
      ) {
        return false;
      }

      if (
        /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(line)
      ) {
        return false;
      }

      if (
        /\b(?:pvt|ltd|limited|foods|industries|company|corporation|packer|importer)\b/i.test(
          line
        )
      ) {
        return false;
      }

      /*
       * Ingredient-style text.
       */
      const commaCount =
        (line.match(/,/g) || []).length;

      if (commaCount >= 2) {
        return false;
      }

      /*
       * Nutrition values.
       */
      if (
        /\b(?:kcal|mg|mcg)\b/i.test(line) &&
        /\d/.test(line)
      ) {
        return false;
      }

      const letters =
        (line.match(/[A-Za-z]/g) || []).length;

      return (
        letters >= 2 &&
        letters / line.length > 0.55
      );
    });

  console.log(
    '[Product Name] Clean candidates:',
    candidates
  );

  /* ---------------------------------------------------------
     3. Find product-term anchors
     --------------------------------------------------------- */

  const anchorCandidates = candidates.filter(
    ({ line }) => hasProductTerm(line)
  );

  console.log(
    '[Product Name] Product anchors:',
    anchorCandidates
  );

  /* ---------------------------------------------------------
     4. First preference:
     *    A clean existing multi-word product phrase.
     *
     * Example:
     * "Potato Chips"
     *
     * This is much safer than randomly combining OCR lines.
     * --------------------------------------------------------- */

  const existingProductPhrases = anchorCandidates
    .filter(({ line }) => {
      const words = line.split(/\s+/);

      return (
        words.length >= 2 &&
        words.length <= 6
      );
    })
    .map(({ line }) => ({
      value: line,
      score: 100 + line.split(/\s+/).length * 5,
    }));

  /* ---------------------------------------------------------
     5. Look around product anchors for descriptive title
     *    fragments.
     *
     * We use the ORIGINAL line positions here.
     *
     * This is important.
     *
     * We do NOT use the filtered candidate array position,
     * because filtering changes the relationship between
     * OCR lines.
     * --------------------------------------------------------- */

  const descriptiveWords = [
    'classic',
    'original',
    'style',
    'cream',
    'onion',
    'cheese',
    'tomato',
    'chilli',
    'chili',
    'salted',
    'spicy',
    'mixed',
    'fruit',
    'mint',
    'lemon',
    'garlic',
    'pepper',
    'masala',
    'peri',
    'peri-peri',
  ];

  const isDescriptiveTitleWord = (
    line: string
  ): boolean => {
    const lower = line.toLowerCase();

    return descriptiveWords.some((word) =>
      new RegExp(`\\b${word}\\b`, 'i').test(lower)
    );
  };

  const anchorResults: Array<{
    value: string;
    score: number;
  }> = [];

  for (const anchor of anchorCandidates) {
    const anchorIndex = anchor.index;

    /*
     * Search nearby OCR lines.
     *
     * We allow a reasonable gap because OCR reading order
     * can be messy when the package has multiple columns.
     */
    const nearby = candidates.filter(
      ({ index }) =>
        Math.abs(index - anchorIndex) <= 10
    );

    const titleParts: Array<{
      line: string;
      index: number;
    }> = [];

    for (const candidate of nearby) {
      if (
        candidate.index === anchorIndex
      ) {
        continue;
      }

      const line = candidate.line;

      if (isMarketingText(line)) {
        continue;
      }

      if (isBlocked(line)) {
        continue;
      }

      /*
       * Do not use standalone "Free", "Real", etc.
       */
      const lower = line.toLowerCase();

      if (
        [
          'free',
          'real',
          'taste',
          'added',
          'natural',
          'healthy',
          'premium',
          'quality',
          'your',
          'city',
          'keep',
          'clean',
        ].includes(lower)
      ) {
        continue;
      }

      /*
       * Avoid manufacturer/declaration text.
       */
      if (
        /\b(?:tastybite|foods?|pvt|ltd|limited|fssai|lic|customer|consumer|manager)\b/i.test(
          line
        )
      ) {
        continue;
      }

      titleParts.push(candidate);
    }

    /*
     * Sort according to OCR position.
     */
    titleParts.sort(
      (a, b) => a.index - b.index
    );

    /*
     * Find the strongest descriptive fragment.
     */
    const descriptive = titleParts.filter(
      ({ line }) =>
        isDescriptiveTitleWord(line)
    );

    /*
     * Build combinations ONLY from title-like fragments
     * and the actual product anchor.
     */
    for (const part of descriptive) {
      const combined = cleanProductText(
        `${part.line} ${anchor.line}`
      );

      const words = combined.split(/\s+/);

      if (
        words.length < 2 ||
        words.length > 7
      ) {
        continue;
      }

      if (isMarketingText(combined)) {
        continue;
      }

      if (
        /\b(?:free|added|preservatives|your|city|keep|clean)\b/i.test(
          combined
        )
      ) {
        continue;
      }

      let score = 80;

      score += 20;

      if (hasProductTerm(combined)) {
        score += 30;
      }

      if (isDescriptiveTitleWord(part.line)) {
        score += 20;
      }

      /*
       * Prefer shorter sensible titles.
       */
      if (words.length <= 5) {
        score += 10;
      }

      /*
       * Penalize very large gaps in OCR.
       */
      score -= Math.abs(
        part.index - anchorIndex
      ) * 1.5;

      anchorResults.push({
        value: combined,
        score,
      });
    }
  }

  /* ---------------------------------------------------------
     6. Add clean existing product phrases.
     --------------------------------------------------------- */

  const allResults = [
    ...existingProductPhrases,
    ...anchorResults,
  ];

  allResults.sort(
    (a, b) => b.score - a.score
  );

  console.log(
    '[Product Name] Ranked results:',
    allResults
  );

  /* ---------------------------------------------------------
     7. Return best result
     --------------------------------------------------------- */

  if (allResults.length > 0) {
    return allResults[0].value;
  }

  /* ---------------------------------------------------------
     8. Final fallback
     --------------------------------------------------------- */

  const fallback = candidates
    .filter(({ line }) =>
      hasProductTerm(line)
    )
    .sort((a, b) => {
      const aWords =
        a.line.split(/\s+/).length;

      const bWords =
        b.line.split(/\s+/).length;

      return bWords - aWords;
    });

  return fallback[0]?.line ?? null;
}
/* =========================================================
   NET QUANTITY
   ========================================================= */

function extractNetQuantity(text: string): string | null {
  const normalized = normalizeOcrText(text);

  return firstMatch(normalized, [
    /(?:NET\s+(?:QUANTITY|WEIGHT|WT|VOLUME|CONTENT|QTY))\s*:\s*([0-9][0-9.,]*\s*(?:kg|g|gm|gram|grams|l|ml|ltr|litre|liter|mg|mcg|oz|lb|pcs|pieces|tablets|capsules|sachets|packs?|units?|count|ct|nos?\.?))\b/i,
  ]);
}

/* =========================================================
   MRP
   ========================================================= */

function extractMrp(text: string): string | null {
  if (!text) return null;

  const raw = text
    .replace(/\r/g, '\n')
    .replace(
      /M\s*\.?\s*R\s*\.?\s*P\s*\.?/gi,
      'MRP'
    )
    .replace(
      /MAXIMUM\s+RETAIL\s+PRICE/gi,
      'MRP'
    );

  const lines = raw
    .split('\n')
    .map((line) =>
      line
        .replace(/[|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(
      /\bMRP\b\s*[:=\-–—]?\s*(?:₹|¥|RS\.?|INR|Z|2)?\s*([0-9]{1,5}(?:[.,][0-9]{1,2})?)/i
    );

    if (match?.[1]) {
      const value = match[1]
        .replace(/,/g, '')
        .trim();

      const number = Number(value);

      if (
        Number.isFinite(number) &&
        number > 0 &&
        number < 100000
      ) {
        return value;
      }
    }
  }

  return null;
}

/* =========================================================
   BATCH
   ========================================================= */

function extractBatchNumber(text: string): string | null {
  const normalized = normalizeOcrText(text);

  return firstMatch(normalized, [
    /(?:BATCH\s*(?:NO\.?|NUMBER)?|LOT\s*(?:NO\.?|NUMBER)?)\s*:\s*([A-Z0-9][A-Z0-9\-\/]{2,24})/i,
  ]);
}

/* =========================================================
   MANUFACTURER
   ========================================================= */

function extractManufacturer(text: string): string | null {
  const lines = linesOf(text);

  const start = lineIndex(
    lines,
    /^(?:MANUFACTURED|PACKED|MARKETED|IMPORTED|DISTRIBUTED)\s+BY\s*:/i
  );

  if (start < 0) return null;

  const first = lines[start]
    .replace(
      /^(?:MANUFACTURED|PACKED|MARKETED|IMPORTED|DISTRIBUTED)\s+BY\s*:/i,
      ''
    )
    .trim();

  if (
    first &&
    !isLikelyDeclaration(first)
  ) {
    return first;
  }

  const next = lines[start + 1];

  if (
    next &&
    !isLikelyDeclaration(next) &&
    !/^(?:PLOT|NO\.?\s*\d|SURVEY|ROAD|SECTOR|VILLAGE|DISTRICT|GURUGRAM|GURGAON|HARYANA|INDIA)/i.test(
      next
    )
  ) {
    return next;
  }

  return null;
}

/* =========================================================
   ADDRESS
   ========================================================= */

function extractAddress(text: string): string | null {
  if (!text) return null;

  const rawLines = text
    .replace(/\r/g, '\n')
    .split('\n')
    .map(cleanLine)
    .filter(Boolean);

  const startPatterns = [
    /^MANUFACTURED\s+BY\s*:?\s*$/i,
    /^MANUFACTURER\s*:?\s*$/i,
    /^PACKED\s+BY\s*:?\s*$/i,
    /^PACKER\s*:?\s*$/i,
  ];

  const stopPatterns = [
    /^FSSAI\b/i,
    /^LIC\.?\s*NO/i,
    /^LICENCE/i,
    /^LICENSE/i,
    /^CONSUMER\s+CARE/i,
    /^CUSTOMER\s+CARE/i,
    /^DATE\s+OF\s+MANUFACTURE/i,
    /^USE\s+BY/i,
    /^BEST\s+BEFORE/i,
    /^BATCH\s*(?:NO|NUMBER)?/i,
    /^MRP\b/i,
    /^NET\s+(?:WEIGHT|WT|QUANTITY)/i,
    /^UNIT\s+SALE\s+PRICE/i,
    /^INGREDIENTS/i,
    /^NUTRITION/i,
  ];

  const isStopLine = (line: string): boolean => {
    return stopPatterns.some((pattern) =>
      pattern.test(line)
    );
  };

  /*
   * Find the manufacturer/packer declaration.
   */
  let startIndex = -1;

  for (let i = 0; i < rawLines.length; i++) {
    if (startPatterns.some((pattern) => pattern.test(rawLines[i]))) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    return null;
  }

  /*
   * The line immediately after MANUFACTURED BY is
   * normally the manufacturer name.
   *
   * We skip that line because it belongs to the
   * Manufacturer field.
   */
  const addressParts: string[] = [];

  for (
    let i = startIndex + 2;
    i < Math.min(startIndex + 8, rawLines.length);
    i++
  ) {
    const line = rawLines[i];

    if (isStopLine(line)) {
      break;
    }

    /*
     * Ignore obvious OCR garbage.
     */
    if (
      line.length < 5 ||
      /^[^A-Za-z0-9]*$/i.test(line)
    ) {
      continue;
    }

    const letters =
      (line.match(/[A-Za-z]/g) || []).length;

    if (
      letters < 3 ||
      letters / line.length < 0.45
    ) {
      continue;
    }

    addressParts.push(line);
  }

  /*
   * Join multi-line address into one address.
   */
  if (addressParts.length > 0) {
    return addressParts
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /*
   * Fallback:
   * Search for a line that looks like an address
   * containing common address indicators.
   */
  const addressCandidates = rawLines.filter((line) => {
    if (isStopLine(line)) return false;

    return (
      /\b(?:plot|road|street|sector|industrial|area|park|nagar|estate|district|city|india|rajasthan|gujarat|maharashtra|delhi|haryana)\b/i.test(
        line
      ) &&
      /\d/.test(line)
    );
  });

  if (addressCandidates.length > 0) {
    return addressCandidates
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return null;
}

/* =========================================================
   MANUFACTURING DATE
   ========================================================= */

function extractManufacturingDate(
  text: string
): string | null {
  const normalized = normalizeOcrText(text);

  return firstMatch(normalized, [
    /DATE\s+OF\s+MANUFACTURE\s*:\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,

    /(?:MFG\.?\s*DATE|MANUFACTURING\s*DATE|PACKING\s*DATE|PACKED\s*ON|MFD\.?)\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
  ]);
}

/* =========================================================
   BEST BEFORE
   ========================================================= */

function extractBestBefore(
  text: string
): string | null {
  const normalized = normalizeOcrText(text);

  return firstMatch(normalized, [
    /(?:USE\s*BY|BEST\s*BEFORE|BEST\s*IF\s*USED\s*BY|EXPIRY|EXP\.?\s*DATE|EXP)\s*:\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
  ]);
}

/* =========================================================
   CONSUMER CARE
   ========================================================= */

function extractConsumerCare(
  text: string
): string | null {
  const lines = linesOf(text);

  const start = lineIndex(
    lines,
    /^CONSUMER\s+(?:FEEDBACK|CARE|SERVICES?\s+MANAGER)\s*:/i
  );

  const values: string[] = [];

  if (start >= 0) {
    for (
      let i = start;
      i < Math.min(lines.length, start + 10);
      i += 1
    ) {
      const line = lines[i];

      if (
        /^(?:INGREDIENTS|NUTRITION|MRP|NET|BATCH|DATE|USE BY|BEST BEFORE|FSSAI|LIC\s*NO)/i.test(
          line
        ) &&
        i > start
      ) {
        break;
      }

      values.push(line);
    }
  }

  const block = values.join(' ');

  const phoneMatches =
    block.match(
      /(?:\+?\d[\d\s().-]{7,}\d)/g
    ) || [];

  const emailMatches =
    block.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    ) || [];

  const useful = [
    ...phoneMatches,
    ...emailMatches,
  ];

  if (useful.length > 0) {
    return Array.from(
      new Set(useful.map(cleanLine))
    ).join(' · ');
  }

  return values.length
    ? cleanLine(values.join(' ')).slice(0, 500)
    : null;
}

/* =========================================================
   INGREDIENTS
   ========================================================= */

function extractIngredients(text: string): string | null {
  if (!text) return null;

  const rawLines = text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) =>
      line
        .replace(/[|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean);

  const startIndex = rawLines.findIndex((line) =>
    /^INGREDIENTS?\s*:?\s*$/i.test(line)
  );

  if (startIndex === -1) {
    return null;
  }

  const stopPatterns = [
    /^(?:NUTRITIONAL|NUTRITION)\s+INFORMATION/i,
    /^NUTRITION\s*:?\s*$/i,
    /^PER\s+100\s*(?:G|GRAMS?)?/i,
    /^ENERGY\s*:?\s*\d/i,
    /^PROTEIN\s*:?\s*\d/i,
    /^CARBOHYDRATE\s*:?\s*\d/i,
    /^TOTAL\s+SUGARS?\s*:?\s*\d/i,
    /^TOTAL\s+FAT\s*:?\s*\d/i,
    /^SATURATED\s+FAT\s*:?\s*\d/i,
    /^TRANS\s+FAT\s*:?\s*\d/i,
    /^SODIUM\s*:?\s*\d/i,
    /^NET\s+(?:QUANTITY|WEIGHT|WT|CONTENT)/i,
    /^MRP\b/i,
    /^UNIT\s+SALE/i,
    /^DATE\s+OF\s+MANUFACTURE/i,
    /^USE\s+BY/i,
    /^BEST\s+BEFORE/i,
    /^BATCH\s+(?:NO|NUMBER)/i,
    /^MANUFACTURED\s+BY/i,
    /^PACKED\s+BY/i,
    /^FSSAI/i,
    /^CONSUMER/i,
    /^COUNTRY\s+OF\s+ORIGIN/i,
  ];

  const noisePatterns = [
    /^(?:real|taste|classic|keep|clean|your|city)$/i,
    /^(?:free|gluten|potato|chips)$/i,
    /^\(?\d+\)?$/,
    /^[^A-Za-z]+$/,
  ];

  const ingredientLines: string[] = [];

  for (let i = startIndex + 1; i < rawLines.length; i++) {
    const line = rawLines[i];

    if (stopPatterns.some((pattern) => pattern.test(line))) {
      break;
    }

    let cleaned = line;

    // Remove obvious isolated OCR/marketing fragments.
    cleaned = cleaned
      .replace(/\b(?:Real|Taste|Keep|Clean|Your City)\s+\d+\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) continue;

    // Ignore very short OCR fragments unless they contain useful
    // ingredient information such as INS numbers.
    if (
      cleaned.length < 4 &&
      !/\bINS\s*\d{3}\b/i.test(cleaned)
    ) {
      continue;
    }

    if (noisePatterns.some((pattern) => pattern.test(cleaned))) {
      continue;
    }

    // Keep lines that look like actual ingredient declarations.
    const hasIngredientContent =
      /[,()]/.test(cleaned) ||
      /\b(?:potato|potatoes|oil|seasoning|sugar|salt|onion|garlic|milk|spices?|herbs?|acidity|flavour|flavor|enhancer|natural|identical|anticaking|palmolein|maltodextrin)\b/i.test(
        cleaned
      ) ||
      /\bINS\s*\d{3}\b/i.test(cleaned);

    if (hasIngredientContent) {
      ingredientLines.push(cleaned);
    }
  }

  if (ingredientLines.length === 0) {
    return null;
  }

  // Join multi-line OCR output into one readable declaration.
  let result = ingredientLines.join(' ');

  // Fix spacing around punctuation.
  result = result
    .replace(/\s+,/g, ',')
    .replace(/,\s*/g, ', ')
    .replace(/\s+\)/g, ')')
    .replace(/\(\s+/g, '(')
    .replace(/\s+/g, ' ')
    .trim();

  return result || null;
}

/* =========================================================
   NUTRITION
   ========================================================= */

function extractNutrition(text: string): string | null {
  if (!text) return null;

  /*
   * Preserve line structure.
   *
   * DO NOT flatten the complete OCR into one line.
   * Nutrition OCR can contain:
   *
   * Protein 6.89
   * Carbohydrate 523g
   *
   * or:
   *
   * Protein
   * 6.89
   *
   * Both formats are supported.
   */
  const lines = text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) =>
      line
        .replace(/[|]+/g, ' ')
        .replace(/[¢©®°]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)
    .filter((line) => !/^svg$/i.test(line));

  if (lines.length === 0) {
    return null;
  }

  const fullText = lines.join('\n');

  /*
   * Make sure this is actually a nutrition section.
   */
  const nutritionStart = lines.findIndex((line) =>
    /\b(?:NUTRITIONAL\s+INFORMATION|NUTRITION\s+INFORMATION|NUTRITION|PER\s*100\s*(?:G|GRAMS?)?)\b/i.test(
      line
    )
  );

  if (nutritionStart === -1) {
    return null;
  }

  /*
   * Nutrition normally appears before these declarations.
   */
  const stopPattern =
    /\b(?:NET\s+(?:QUANTITY|WEIGHT|WT|CONTENT)|MRP|UNIT\s+SALE\s+PRICE|DATE\s+OF\s+MANUFACTURE|USE\s+BY|BEST\s+BEFORE|BATCH\s+(?:NO|NUMBER)|MANUFACTURED\s+BY|PACKED\s+BY|FSSAI|CONSUMER\s+(?:CARE|FEEDBACK)|COUNTRY\s+OF\s+ORIGIN)\b/i;

  const nutritionLines: string[] = [];

  for (let i = nutritionStart; i < lines.length; i++) {
    const line = lines[i];

    if (
      i > nutritionStart &&
      stopPattern.test(line)
    ) {
      break;
    }

    nutritionLines.push(line);
  }

  if (nutritionLines.length === 0) {
    return null;
  }

  /*
   * Known nutrient names.
   */
  const nutrientNames = [
    'Energy',
    'Protein',
    'Carbohydrate',
    'Total Sugars',
    'Added Sugars',
    'Total Fat',
    'Saturated Fat',
    'Trans Fat',
    'Sodium',
    'Dietary Fibre',
    'Cholesterol',
  ] as const;

  type NutrientName = (typeof nutrientNames)[number];

  const canonicalizeNutrient = (
    value: string
  ): NutrientName | null => {
    const normalized = value
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    if (normalized === 'energy') return 'Energy';
    if (normalized === 'protein') return 'Protein';

    if (
      normalized === 'carbohydrate' ||
      normalized === 'carbohydrates'
    ) {
      return 'Carbohydrate';
    }

    if (
      normalized === 'total sugar' ||
      normalized === 'total sugars'
    ) {
      return 'Total Sugars';
    }

    if (
      normalized === 'added sugar' ||
      normalized === 'added sugars'
    ) {
      return 'Added Sugars';
    }

    if (
      normalized === 'total fat'
    ) {
      return 'Total Fat';
    }

    if (
      normalized === 'saturated fat'
    ) {
      return 'Saturated Fat';
    }

    if (
      normalized === 'trans fat'
    ) {
      return 'Trans Fat';
    }

    if (normalized === 'sodium') {
      return 'Sodium';
    }

    if (
      normalized === 'dietary fibre' ||
      normalized === 'dietary fiber'
    ) {
      return 'Dietary Fibre';
    }

    if (normalized === 'cholesterol') {
      return 'Cholesterol';
    }

    return null;
  };

  /*
   * Extract a numeric candidate from a line.
   */
  const numericCandidates = (
    line: string
  ): string[] => {
    return (
      line.match(
        /(?<![A-Za-z])\d+(?:[.,]\d+)?(?:\s*(?:g|mg|kcal|kj))?(?![A-Za-z])/gi
      ) || []
    );
  };

  /*
   * OCR decimal repair.
   *
   * This is applied only to a value already associated
   * with a known nutrient.
   */
  const normalizeNutritionNumber = (
    rawValue: string,
    nutrient: NutrientName
  ): string | null => {
    let value = rawValue
      .toLowerCase()
      .replace(/,/g, '.')
      .replace(/[^0-9.]/g, '');

    if (!value) {
      return null;
    }

    /*
     * Remove duplicate decimal points safely.
     */
    const firstDot = value.indexOf('.');

    if (firstDot !== -1) {
      const before = value.slice(0, firstDot + 1);
      const after = value
        .slice(firstDot + 1)
        .replace(/\./g, '');

      value = before + after;
    }

    /*
     * Energy is normally an integer.
     */
    if (nutrient === 'Energy') {
      const number = Number(value);

      if (
        Number.isFinite(number) &&
        number > 0 &&
        number < 10000
      ) {
        return String(number);
      }

      return null;
    }

    /*
     * Sodium is normally mg and should not have
     * decimal-loss repair like gram nutrients.
     */
    if (nutrient === 'Sodium') {
      const number = Number(value);

      if (
        Number.isFinite(number) &&
        number >= 0 &&
        number < 100000
      ) {
        return String(number);
      }

      return null;
    }

    /*
     * Trans Fat:
     * 01 -> 0.1
     */
    if (
      nutrient === 'Trans Fat' &&
      /^01$/.test(value)
    ) {
      return '0.1';
    }

    /*
     * OCR may produce:
     *
     * 523 -> 52.3
     * 342 -> 34.2
     * 148 -> 14.8
     */
    if (
      /^\d{3}$/.test(value)
    ) {
      const repaired =
        `${value.slice(0, -1)}.${value.slice(-1)}`;

      const number = Number(repaired);

      if (
        Number.isFinite(number) &&
        number >= 0 &&
        number < 1000
      ) {
        return repaired;
      }
    }

    /*
     * 3424 -> 34.2
     *
     * Only use this when it is a plausible gram
     * nutrient value.
     */
    if (
      /^\d{4}$/.test(value)
    ) {
      const repaired =
        `${value.slice(0, 2)}.${value.slice(2, 3)}`;

      const number = Number(repaired);

      if (
        Number.isFinite(number) &&
        number >= 0 &&
        number < 1000
      ) {
        return repaired;
      }
    }

    /*
     * 24 -> 2.4
     *
     * Only for nutrients where this is a plausible
     * decimal quantity.
     */
    if (
      /^\d{2}$/.test(value) &&
      (
        nutrient === 'Total Sugars' ||
        nutrient === 'Added Sugars' ||
        nutrient === 'Saturated Fat' ||
        nutrient === 'Trans Fat' ||
        nutrient === 'Dietary Fibre'
      )
    ) {
      const repaired =
        `${value.slice(0, 1)}.${value.slice(1)}`;

      const number = Number(repaired);

      if (
        Number.isFinite(number) &&
        number >= 0 &&
        number < 100
      ) {
        return repaired;
      }
    }

    const number = Number(value);

    if (
      !Number.isFinite(number) ||
      number < 0 ||
      number >= 10000
    ) {
      return null;
    }

    return value;
  };

  /*
   * Find a value on the same line or immediately after
   * a nutrient label.
   */
  const findValueForNutrient = (
    index: number,
    nutrient: NutrientName
  ): string | null => {
    const currentLine =
      nutritionLines[index];

    /*
     * 1. Value on the same line.
     *
     * Example:
     * Protein 6.8 g
     */
    const sameLine =
      currentLine
        .replace(
          new RegExp(
            nutrient
              .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'i'
          ),
          ''
        )
        .trim();

    const sameCandidates =
      numericCandidates(sameLine);

    for (const candidate of sameCandidates) {
      const value =
        normalizeNutritionNumber(
          candidate,
          nutrient
        );

      if (value !== null) {
        return value;
      }
    }

    /*
     * 2. Look at the next few lines.
     *
     * This handles:
     *
     * Protein
     * 6.89
     */
    for (
      let offset = 1;
      offset <= 4;
      offset++
    ) {
      const nextIndex =
        index + offset;

      if (
        nextIndex >=
        nutritionLines.length
      ) {
        break;
      }

      const candidateLine =
        nutritionLines[nextIndex];

      /*
       * Stop if another nutrient starts before
       * we find a value.
       */
      const anotherNutrient =
        nutrientNames.some((name) => {
          if (
            name === nutrient
          ) {
            return false;
          }

          return new RegExp(
            `\\b${name
              .replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&'
              )}\\b`,
            'i'
          ).test(candidateLine);
        });

      if (anotherNutrient) {
        break;
      }

      const candidates =
        numericCandidates(
          candidateLine
        );

      for (const candidate of candidates) {
        const value =
          normalizeNutritionNumber(
            candidate,
            nutrient
          );

        if (value !== null) {
          return value;
        }
      }
    }

    return null;
  };

  const found = new Map<
    NutrientName,
    string
  >();

  /*
   * Process every nutrition line.
   */
  for (
    let i = 0;
    i < nutritionLines.length;
    i++
  ) {
    const line =
      nutritionLines[i];

    for (
      const nutrient of nutrientNames
    ) {
      const nutrientRegex =
        new RegExp(
          `\\b${nutrient
            .replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&'
            )}\\b`,
          'i'
        );

      if (!nutrientRegex.test(line)) {
        continue;
      }

      if (found.has(nutrient)) {
        continue;
      }

      const value =
        findValueForNutrient(
          i,
          nutrient
        );

      if (value !== null) {
        found.set(
          nutrient,
          value
        );
      }
    }
  }

  /*
   * Special handling for Energy when OCR places
   * "540 kcal" BEFORE the word "Energy".
   *
   * Example:
   *
   * 540 kcal
   * No Added
   * Energy
   */
  if (!found.has('Energy')) {
    for (
      let i = 0;
      i < nutritionLines.length;
      i++
    ) {
      if (
        !/\bEnergy\b/i.test(
          nutritionLines[i]
        )
      ) {
        continue;
      }

      for (
        let offset = 1;
        offset <= 4;
        offset++
      ) {
        const previousIndex =
          i - offset;

        if (
          previousIndex < 0
        ) {
          break;
        }

        const previousLine =
          nutritionLines[
          previousIndex
          ];

        const match =
          previousLine.match(
            /(\d+(?:[.,]\d+)?)\s*(kcal|kj)\b/i
          );

        if (match?.[1]) {
          const value =
            normalizeNutritionNumber(
              match[1],
              'Energy'
            );

          if (value !== null) {
            found.set(
              'Energy',
              value
            );
          }

          break;
        }
      }
    }
  }

  if (found.size === 0) {
    return null;
  }

  const resultLines: string[] = [
    'Per 100 g',
  ];

  for (
    const nutrient of nutrientNames
  ) {
    const value =
      found.get(nutrient);

    if (!value) {
      continue;
    }

    let unit = 'g';

    if (
      nutrient === 'Energy'
    ) {
      unit = 'kcal';
    } else if (
      nutrient === 'Sodium'
    ) {
      unit = 'mg';
    } else if (
      nutrient === 'Cholesterol'
    ) {
      unit = 'mg';
    }

    resultLines.push(
      `${nutrient}: ${value} ${unit}`
    );
  }

  return resultLines.length > 1
    ? resultLines.join('\n')
    : null;
}
/* =========================================================
   FSSAI
   ========================================================= */

function extractFssai(
  text: string
): string | null {
  const normalized = normalizeOcrText(text);

  const labeled = firstMatch(
    normalized,
    [
      /FSSAI\s+(?:LIC\s*NO\s*:\s*)?(\d{10,14})/i,

      /LIC\s*NO\s*:\s*(\d{10,14})/i,
    ]
  );

  if (labeled) {
    return labeled;
  }

  const candidates =
    normalized.match(/\b\d{14}\b/g) || [];

  return candidates[0] || null;
}

/* =========================================================
   COUNTRY OF ORIGIN
   ========================================================= */

// Recognized country names used as a fallback when the package has
// no explicit "Country of Origin" / "Made in" declaration. Many
// packages (like a domestically manufactured product) never print
// this as its own field — the country is only implied by the
// manufacturer's address. Sorted longest-first so e.g. "United
// Arab Emirates" is preferred over a shorter alias appearing inside
// it.
const KNOWN_COUNTRY_NAMES = [
  'United States of America',
  'United Arab Emirates',
  'United Kingdom',
  'South Africa',
  'New Zealand',
  'South Korea',
  'Sri Lanka',
  'Netherlands',
  'Switzerland',
  'Bangladesh',
  'Indonesia',
  'Singapore',
  'Malaysia',
  'Australia',
  'Philippines',
  'Myanmar',
  'Thailand',
  'Pakistan',
  'Vietnam',
  'Germany',
  'Mexico',
  'Brazil',
  'Turkey',
  'Russia',
  'Canada',
  'France',
  'Nepal',
  'China',
  'Japan',
  'Spain',
  'Italy',
  'India',
  'USA',
  'UAE',
  'UK',
].sort((a, b) => b.length - a.length);

// FIX: return the canonical display form (e.g. "INDIA" / "india" ->
// "India") so the field looks consistent regardless of how it was
// printed/OCR'd on the package.
function canonicalCountryName(value: string): string {
  const normalized = value.trim().toLowerCase();

  for (const name of KNOWN_COUNTRY_NAMES) {
    if (name.toLowerCase() === normalized) {
      return name;
    }
  }

  return value.trim();
}

function findKnownCountryIn(value: string): string | null {
  for (const country of KNOWN_COUNTRY_NAMES) {
    const escaped = country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'i');

    if (pattern.test(value)) {
      return country;
    }
  }

  return null;
}

function extractCountryFromAddress(text: string): string | null {
  const address = extractAddress(text);

  if (!address) return null;

  return findKnownCountryIn(address);
}

function extractCountryOfOrigin(text: string): string | null {
  if (!text) return null;

  // NOTE: fixed to scan line-by-line instead of using a single
  // multi-line regex. The previous version's capture group used
  // `\s` (which also matches newlines), so it kept reading past
  // the end of the "Country of Origin" line into whatever
  // declaration came next on the label. If that next line
  // happened to contain a digit before the code found one of its
  // recognized "stop words", the whole match was discarded and a
  // perfectly valid country value (e.g. "India") was lost.
  const lines = linesOf(text);

  // FIX: the label is no longer anchored to the very start of the
  // line (no more leading `^`). A bullet point, asterisk, or other
  // OCR-picked-up prefix before the label ("* Country of Origin:
  // India") used to prevent any match at all. We now search each
  // normalized line for the label anywhere in it. `\b...\b` keeps
  // "COO" from matching inside unrelated words like "COOL".
  const labelPattern =
    /\b(?:COUNTRY\s+OF\s+ORIGIN|MADE\s+IN|PRODUCT\s+OF|COO)\b\s*[:\-]?\s*(.*)$/i;

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(labelPattern);

    if (!match) continue;

    let candidate = cleanLine(match[1] || '');

    // Label had nothing after it on the same line — check the
    // very next line only (never further, to avoid bleeding
    // into unrelated declarations).
    if (!candidate && i + 1 < lines.length) {
      candidate = cleanLine(lines[i + 1]);
    }

    if (!candidate) continue;

    // Stop at the first comma/semicolon so we never spill into
    // a trailing declaration appended on the same line, then trim
    // trailing punctuation OCR commonly appends (periods, stray
    // quotes/dashes) — FIX: previously "India." was rejected
    // outright because of the trailing period.
    let cleaned = candidate.split(/[,;]/)[0].trim();
    cleaned = cleaned.replace(/[.\-–—"'`]+$/g, '').trim();

    if (
      cleaned.length >= 2 &&
      cleaned.length <= 40 &&
      /^[A-Za-z\s]+$/.test(cleaned) &&
      !isLikelyDeclaration(cleaned)
    ) {
      return canonicalCountryName(cleaned);
    }
  }

  // FALLBACK 1: many packages (e.g. domestically manufactured goods)
  // never print an explicit "Country of Origin" declaration — the
  // country is only implied by the manufacturer/packer address
  // (e.g. "...Rajasthan - 301019, India."). Infer it from there
  // rather than reporting "Not detected" when the address clearly
  // names a country.
  const fromAddress = extractCountryFromAddress(text);

  if (fromAddress) {
    return fromAddress;
  }

  // FALLBACK 2 (FIX — new): as an absolute last resort, scan the
  // entire raw OCR text for a known country name. This covers
  // packages where neither a labelled declaration nor a recognizable
  // manufacturer-address block was picked up by OCR at all, but a
  // country name is still visible somewhere on the label. Safe in
  // practice: packaged-goods declarations essentially never mention
  // a country name unless it genuinely is the origin/manufacturing
  // location.
  return findKnownCountryIn(text);
}
/* =========================================================
   BARCODE
   ========================================================= */

export function isValidEAN13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) {
    return false;
  }

  const digits = value.split('').map(Number);

  let sum = 0;

  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === digits[12];
}


export function isValidEAN8(value: string): boolean {
  if (!/^\d{8}$/.test(value)) {
    return false;
  }

  const digits = value.split('').map(Number);

  let sum = 0;

  for (let i = 0; i < 7; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1);
  }

  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === digits[7];
}

function isValidUPCA(value: string): boolean {
  if (!/^\d{12}$/.test(value)) return false;

  const digits = value.split('').map(Number);

  let sum = 0;

  for (let i = 0; i < 11; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1);
  }

  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === digits[11];
}

function isValidBarcodeValue(value: string): boolean {
  if (value.length === 13) return isValidEAN13(value);
  if (value.length === 8) return isValidEAN8(value);
  if (value.length === 12) return isValidUPCA(value);
  return false;
}

// ---------------------------------------------------------------
// FIX (new): common OCR letter/digit confusions seen on real,
// imperfect prints — blur, low resolution, compression artifacts,
// slight skew. Tesseract very often reads a barcode's printed
// digits with a handful of these substituted in, especially at
// low print quality. This map is applied ONLY to short,
// already-barcode-shaped candidate strings below — never to normal
// prose — so it cannot corrupt unrelated fields like brand or
// product name.
// ---------------------------------------------------------------
const DIGIT_CONFUSION_MAP: Record<string, string> = {
  O: '0', o: '0', Q: '0',
  I: '1', l: '1', i: '1', L: '1',
  S: '5', s: '5',
  B: '8',
  G: '6', g: '9',
  Z: '2', z: '2',
  T: '7',
};

function deconfuseDigits(str: string): string {
  return str.replace(/[A-Za-z]/g, (ch) => DIGIT_CONFUSION_MAP[ch] ?? ch);
}

// Built from the same map so the "which letters count as digit-ish"
// character class can never silently drift out of sync with the
// substitution table above.
const CONFUSABLE_CHARS = Object.keys(DIGIT_CONFUSION_MAP).join('');
const DIGITISH_CLASS = `0-9${CONFUSABLE_CHARS}`;

// A string is "barcode-ish" if, after stripping whitespace, it's a
// plausible barcode length and any letters in it are ones we know
// are commonly confused with digits (i.e. it's not real prose that
// happens to contain some digits).
function isBarcodeish(str: string): boolean {
  const compact = str.replace(/\s+/g, '');

  if (compact.length < 6 || compact.length > 24) return false;

  const letters = compact.match(/[A-Za-z]/g) || [];

  if (letters.length === 0) return true;

  const confusable = letters.filter(
    (ch) => ch in DIGIT_CONFUSION_MAP
  ).length;

  return (
    confusable / letters.length >= 0.6 &&
    letters.length <= compact.length * 0.5
  );
}

// Barcode text can have a single stray character stuck to one edge
// (a misread guard-bar, a smudge, a leftover punctuation mark from
// a neighbouring line, as commonly happens right next to a printed
// barcode). If the digit run is exactly one character too long,
// also offer the "drop first" / "drop last" variants. Only used in
// the unchecksummed last-resort tier below — never in the
// checksum-validated tier, where a truncated 13-digit run could
// otherwise coincidentally satisfy the (different) 12-digit UPC-A
// checksum purely by chance and produce a confident-looking but
// wrong result.
function candidateLengths(compact: string): string[] {
  const out = [compact];

  if ([9, 14].includes(compact.length)) {
    out.push(compact.slice(1));
    out.push(compact.slice(0, -1));
  }

  return out;
}

function extractBarcode(text: string): string | null {
  if (!text) return null;

  const raw = text.replace(/\r/g, '\n');

  // 1. Look for explicitly labelled barcode values. Tolerant of OCR
  //    letter/digit confusion in the digits themselves now too.
  const labelled = raw.match(
    new RegExp(
      `(?:BARCODE|EAN|UPC|GTIN)\\s*[:\\-]?\\s*([${DIGITISH_CLASS}]{8,14})`,
      'i'
    )
  );

  if (labelled?.[1]) {
    const value = deconfuseDigits(labelled[1]);

    if (isValidBarcodeValue(value)) {
      return value;
    }
  }

  // 2. OCR may read the printed digits without a "BARCODE:" label,
  // and — on a real (non-synthetic) photo — with some digits
  // misread as visually similar letters. Remove quotes/pipes
  // commonly introduced by OCR at barcode guard-bar gaps, gather
  // digit-ish runs, de-confuse them, and keep this pass
  // CHECKSUM-VALIDATED only. Deliberately NO length-trimming here:
  // see candidateLengths() comment above for why that's unsafe at
  // this tier.
  const cleanedForDigits = raw
    .replace(/[“”"'`]/g, '')
    .replace(/[|]/g, ' ');

  const tokenPattern = new RegExp(
    `[${DIGITISH_CLASS}][${DIGITISH_CLASS}\\s.\\-]{6,22}[${DIGITISH_CLASS}]`,
    'g'
  );

  const tokens = cleanedForDigits.match(tokenPattern) || [];

  for (const token of tokens) {
    const compact = token.replace(/[\s.\-]/g, '');

    if (!isBarcodeish(compact) && !/^\d+$/.test(compact)) continue;

    const value = deconfuseDigits(compact);

    if (
      [8, 12, 13].includes(value.length) &&
      isValidBarcodeValue(value)
    ) {
      return value;
    }
  }

  // 3. Last resort, no checksum available: a line that is made up
  // ENTIRELY of digits (plus the punctuation OCR commonly inserts
  // at the gaps between barcode digit groups — quotes, dashes,
  // periods — and letters commonly confused with digits, but no
  // other text) at a standard barcode length. A real printed
  // barcode number is almost always isolated on its own line, so
  // this is a much stronger signal than an arbitrary digit run
  // buried inside mixed text, even though we can't confirm its
  // checksum (e.g. because of an OCR misread, a damaged/blurry
  // print, or — as with some generated mockups — a barcode graphic
  // whose printed digits were never designed to satisfy the real
  // checksum in the first place).
  const isolatedLinePattern = new RegExp(
    `^[${DIGITISH_CLASS}\\s"'“”‘’\`\\-.]+$`
  );

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || !isolatedLinePattern.test(trimmed)) {
      continue;
    }

    const compact = trimmed.replace(/[\s"'“”‘’`\-.]/g, '');

    if (!compact) continue;

    const deconfused = deconfuseDigits(compact);

    for (const value of candidateLengths(deconfused)) {
      if ([8, 12, 13].includes(value.length)) {
        return value;
      }
    }
  }

  return null;
}

/* =========================================================
   EXTRACTOR MAP
   ========================================================= */

const extractors: Record<string, (text: string) => string | null> = {
  brand: extractBrand,
  product_name: extractProductName,
  net_quantity: extractNetQuantity,
  mrp: extractMrp,
  batch_number: extractBatchNumber,
  manufacturer: extractManufacturer,
  address: extractAddress,
  manufacturing_date: extractManufacturingDate,
  best_before: extractBestBefore,
  consumer_care: extractConsumerCare,
  ingredients: extractIngredients,
  nutrition: extractNutrition,
  fssai_number: extractFssai,
  country_of_origin: extractCountryOfOrigin,
  barcode: extractBarcode,
};

/* =========================================================
   CONFIDENCE
   ========================================================= */

function confidenceFor(
  key: string,
  value: string
): number {
  // Confidence here is extraction confidence,
  // not Tesseract's raw OCR confidence.

  if (!value || isNotDetected(value)) {
    return 0;
  }

  switch (key) {
    case 'net_quantity':
      return 0.96;

    case 'batch_number':
      return 0.96;

    case 'manufacturing_date':
      return 0.95;

    case 'best_before':
      return 0.95;

    case 'fssai_number':
      return /^\d{14}$/.test(value)
        ? 0.98
        : 0.60;

    case 'mrp':
      return 0.88;

    case 'ingredients':
      return 0.90;

    case 'nutrition':
      return 0.90;

    case 'manufacturer':
      return 0.90;

    case 'address':
      return 0.88;

    case 'consumer_care':
      return 0.88;

    case 'barcode':
      return 0.98;

    case 'brand':
      return 0.72;

    case 'product_name':
      return 0.78;

    default:
      return 0.80;
  }
}

/* =========================================================
   EXTRACT ALL FIELDS
   ========================================================= */

export function extractAllFields(
  rawText: string
): ParsedField[] {
  const fields: ParsedField[] = [];

  // IMPORTANT:
  // Pass the ORIGINAL OCR text to every extractor.
  // Individual extractors normalize it when necessary.

  for (const key of FIELD_ORDER) {
    const extractor = extractors[key];

    if (!extractor) {
      continue;
    }

    const value = extractor(rawText);

    if (
      value &&
      !isNotDetected(value)
    ) {
      fields.push({
        field_name: key,
        field_value: value,
        confidence: confidenceFor(
          key,
          value
        ),
      });
    }
  }

  return fields;
}

/* =========================================================
   BUILD ALL FIELDS
   ========================================================= */

export function buildAllFields(
  rawText: string
): ParsedField[] {
  const detected =
    extractAllFields(rawText);

  const detectedKeys = new Set(
    detected.map(
      (field) => field.field_name
    )
  );

  for (const key of FIELD_ORDER) {
    if (!detectedKeys.has(key)) {
      detected.push({
        field_name: key,
        field_value: NOT_DETECTED,
        confidence: 0,
      });
    }
  }

  return FIELD_ORDER
    .map((key) =>
      detected.find(
        (field) =>
          field.field_name === key
      )
    )
    .filter(Boolean) as ParsedField[];
}