import type { ParsedReceipt, ExpenseCategory } from '../types';
import { CATEGORIES } from '../types';

const DATE_PATTERNS = [
  /DATE[:\s]+(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/i,
  /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
  /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i,
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})/i,
];

const TIME_PATTERNS = [
  /TIME[:\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/i,
  /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  /(\d{1,2}):(\d{2}):(\d{2})/,
  /(\d{1,2}):(\d{2})/,
];

const TOTAL_PATTERNS = [
  /TOTAL\s*(?:CAD|USD|US|CA)?[^0-9\n]{0,12}\$?\s*([\d,]+\.\d{2})/i,
  /(?:amount\s+due|balance\s+due|grand\s+total|subtotal|purchase)[:\s]*(?:CAD|USD)?[^0-9\n]{0,8}\$?\s*([\d,]+\.\d{2})/i,
  /(?:^|\n)\s*CREDIT\s+\$?\s*([\d,]+\.\d{2})/im,
];

const MERCHANT_SKIP =
  /^(transaction|record|customer|copy|welcome|thank|receipt|invoice|order|tel|phone|www|http|date|time|store|trans|paypoint|cashier|gst|hst|pump|fuel|purchase|credit|debit|mastercard|visa|amex|approved|reference|invoice|auth|important|retain|reconciliation|balance|total|cad|usd|\d)/i;

const ADDRESS_SKIP =
  /\b(street|st\.?|ave|avenue|road|rd\.?|blvd|drive|dr\.?|suite|unit)\b|\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b|\b\d{1,5}\s+\w+\s+(st|street|ave)\b/i;

const KNOWN_MERCHANTS: { pattern: RegExp; name: string }[] = [
  { pattern: /esso\s*circle\s*k|circle\s*k\s*esso|ess\s+circle\s*k|ess\s*o?\s*circle\s*k/i, name: 'Esso Circle K' },
  { pattern: /\besso\b/i, name: 'Esso' },
  { pattern: /\bcircle\s*k\b/i, name: 'Circle K' },
  { pattern: /\bpetro[\s-]?canada\b/i, name: 'Petro-Canada' },
  { pattern: /\bshell\b/i, name: 'Shell' },
  { pattern: /\bchevron\b/i, name: 'Chevron' },
  { pattern: /\bcostco\b/i, name: 'Costco' },
  { pattern: /\bwalmart\b/i, name: 'Walmart' },
  { pattern: /\bstarbucks\b/i, name: 'Starbucks' },
  { pattern: /\buber\b/i, name: 'Uber' },
  { pattern: /\blyft\b/i, name: 'Lyft' },
];

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function pad(n: number | string): string {
  return String(n).padStart(2, '0');
}

function parseAmount(value: string): number {
  return parseFloat(value.replace(/,/g, ''));
}

async function preprocessReceiptImage(imageData: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(1.5, Math.min(3, 2200 / img.width));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageData);
        return;
      }

      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      const pixels = ctx.getImageData(0, 0, w, h);
      const d = pixels.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const contrast = Math.max(0, Math.min(255, (gray - 128) * 1.8 + 128));
        const v = contrast > 155 ? 255 : contrast < 95 ? 0 : contrast;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      ctx.putImageData(pixels, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageData);
    img.src = imageData;
  });
}

function parseDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    if (/DATE/i.test(pattern.source) || /^\d{4}/.test(match[0])) {
      const y = match[1];
      const m = match[2];
      const d = match[3];
      return `${y}-${pad(m)}-${pad(d)}`;
    }

    if (/Jan|Feb|Mar/i.test(match[0])) {
      if (isNaN(Number(match[1]))) {
        const month = MONTH_MAP[match[1].slice(0, 3).toLowerCase()];
        return `${match[3]}-${month}-${pad(match[2])}`;
      }
      const month = MONTH_MAP[match[2].slice(0, 3).toLowerCase()];
      return `${match[3]}-${month}-${pad(match[1])}`;
    }

    const [, a, b, c] = match;
    const year = c.length === 2 ? `20${c}` : c;
    const n1 = parseInt(a, 10);
    const n2 = parseInt(b, 10);
    if (n1 <= 12 && n2 <= 31) {
      return `${year}-${pad(n1)}-${pad(n2)}`;
    }
  }
  return null;
}

function parseTime(text: string): string | null {
  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    if (match[3] && /AM|PM/i.test(match[3])) {
      let h = parseInt(match[1], 10);
      const m = match[2];
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return `${pad(h)}:${m}`;
    }
    const h = match[1];
    const m = match[2];
    return `${pad(h)}:${m}`;
  }
  return null;
}

function parseAmountFromText(text: string): number | null {
  const labeled: number[] = [];
  for (const pattern of TOTAL_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      labeled.push(parseAmount(m[1]));
    }
  }
  if (labeled.length) return Math.max(...labeled);

  const dollarRe = /(?:CAD|USD)?\s*\$\s*([\d,]+\.\d{2})/gi;
  const all: number[] = [];
  let m;
  while ((m = dollarRe.exec(text)) !== null) {
    all.push(parseAmount(m[1]));
  }
  if (all.length) return Math.max(...all);

  const lineAmounts = text.match(/\b([\d,]+\.\d{2})\b/g) || [];
  const candidates = lineAmounts
    .map(parseAmount)
    .filter((v) => v > 0.5 && v < 100000);
  return candidates.length ? Math.max(...candidates) : null;
}

function normalizeOcrText(text: string): string {
  return text
    .replace(/[|]/g, 'I')
    .replace(/[£¢]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\n /g, '\n');
}

function guessMerchant(text: string, lines: string[]): string | null {
  const normalized = normalizeOcrText(text);

  for (const { pattern, name } of KNOWN_MERCHANTS) {
    if (pattern.test(normalized)) return name;
  }

  const cleaned = lines
    .map((l) => l.replace(/[^a-zA-Z0-9\s&'-]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  for (const line of cleaned.slice(0, 12)) {
    if (line.length < 3 || line.length > 50) continue;
    if (MERCHANT_SKIP.test(line)) continue;
    if (ADDRESS_SKIP.test(line)) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^[A-Z0-9 ]{3,}$/.test(line) && /[A-Z]{2,}/.test(line)) return line;
  }

  for (const line of cleaned.slice(0, 12)) {
    if (line.length >= 4 && line.length <= 50 && !MERCHANT_SKIP.test(line) && !ADDRESS_SKIP.test(line)) {
      return line;
    }
  }

  return null;
}

function guessCategory(text: string, merchant: string | null): ExpenseCategory {
  const combined = `${text} ${merchant || ''}`.toLowerCase();
  if (/fuel|gas|gasoline|petrol|esso|circle\s*k|petro|shell|chevron|ultramar|pump|litre|liter|\bl\b.*\$\/l|hst included in fuel|gst included in fuel/.test(combined)) {
    return 'Transportation';
  }
  if (/uber|lyft|taxi|parking|transit|metro|train|airline|flight|toll/.test(combined)) return 'Transportation';
  if (/hotel|motel|airbnb|lodging|inn|resort/.test(combined)) return 'Lodging';
  if (/restaurant|cafe|coffee|starbucks|mcdonald|pizza|food|diner|grill|kitchen|bar\b|brew/.test(combined)) return 'Meals';
  if (/office|staples|supplies|paper|ink|toner/.test(combined)) return 'Office Supplies';
  if (/movie|theater|concert|ticket|entertainment/.test(combined)) return 'Entertainment';
  if (/airport|travel|expedia|booking/.test(combined)) return 'Travel';
  return 'Other';
}

function parseOcrResult(text: string, confidence: number): ParsedReceipt {
  const normalized = normalizeOcrText(text);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const merchant = guessMerchant(normalized, lines);
  const date = parseDate(normalized);
  const time = parseTime(normalized);
  const amount = parseAmountFromText(normalized);
  const category = guessCategory(normalized, merchant);

  let score = confidence / 100;
  if (merchant) score += 0.1;
  if (date) score += 0.1;
  if (amount != null) score += 0.15;

  return {
    merchant,
    date,
    time,
    amount,
    category,
    description: merchant ? `Purchase at ${merchant}` : null,
    confidence: Math.min(score, 1),
  };
}

function mergeParsed(primary: ParsedReceipt, fallback: ParsedReceipt): ParsedReceipt {
  return {
    merchant: primary.merchant || fallback.merchant,
    date: primary.date || fallback.date,
    time: primary.time || fallback.time,
    amount: primary.amount ?? fallback.amount,
    category: primary.category !== 'Other' ? primary.category : fallback.category,
    description: primary.description || fallback.description,
    confidence: Math.max(primary.confidence, fallback.confidence),
  };
}

async function runOcr(imageData: string): Promise<ParsedReceipt> {
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });

    const preprocessed = await preprocessReceiptImage(imageData);

    const [raw, enhanced] = await Promise.all([
      worker.recognize(imageData),
      worker.recognize(preprocessed),
    ]);

    const rawParsed = parseOcrResult(raw.data.text, raw.data.confidence);
    const enhancedParsed = parseOcrResult(enhanced.data.text, enhanced.data.confidence);

    return enhancedParsed.confidence >= rawParsed.confidence ? enhancedParsed : rawParsed;
  } finally {
    await worker.terminate();
  }
}

export async function parseReceiptOCR(imageData: string): Promise<ParsedReceipt> {
  return runOcr(imageData);
}

export async function parseReceiptAI(imageData: string): Promise<ParsedReceipt | null> {
  try {
    const res = await fetch('/api/parse-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: imageData }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const p = data.parsed;
    return {
      merchant: p.merchant,
      date: p.date,
      time: p.time,
      amount: p.amount,
      category: CATEGORIES.includes(p.category) ? p.category : 'Other',
      description: p.description,
      confidence: p.confidence ?? 0.9,
    };
  } catch {
    return null;
  }
}

export async function parseReceipt(imageData: string, preferAI = true): Promise<ParsedReceipt> {
  if (preferAI) {
    const [ai, ocr] = await Promise.all([
      parseReceiptAI(imageData),
      parseReceiptOCR(imageData),
    ]);
    if (ai) return mergeParsed(ai, ocr);
    return ocr;
  }
  return parseReceiptOCR(imageData);
}
