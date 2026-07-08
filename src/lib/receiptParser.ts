import type { ParsedReceipt, ExpenseCategory } from '../types';
import { CATEGORIES } from '../types';

const DATE_PATTERNS = [
  /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
  /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i,
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})/i,
];

const TIME_PATTERNS = [
  /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  /(\d{1,2}):(\d{2}):(\d{2})/,
  /(\d{1,2}):(\d{2})/,
];

const AMOUNT_PATTERNS = [
  /(?:total|amount\s+due|balance\s+due|grand\s+total|subtotal)[:\s]*\$?\s*([\d,]+\.\d{2})/i,
  /\$\s*([\d,]+\.\d{2})/g,
  /([\d,]+\.\d{2})\s*(?:USD|CAD)?/g,
];

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function pad(n: number | string): string {
  return String(n).padStart(2, '0');
}

function parseDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    if (/^\d{4}/.test(match[0])) {
      const [, y, m, d] = match;
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
    // US format: MM/DD/YYYY when first part <= 12
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
    return `${pad(match[1])}:${match[2]}`;
  }
  return null;
}

function parseAmount(text: string): number | null {
  const labeled: number[] = [];
  for (const pattern of AMOUNT_PATTERNS.slice(0, 1)) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      labeled.push(parseFloat(m[1].replace(/,/g, '')));
    }
  }
  if (labeled.length) return Math.max(...labeled);

  const all: number[] = [];
  const dollarRe = /\$\s*([\d,]+\.\d{2})/g;
  let m;
  while ((m = dollarRe.exec(text)) !== null) {
    all.push(parseFloat(m[1].replace(/,/g, '')));
  }
  if (all.length) return Math.max(...all);

  const plainRe = /\b([\d,]+\.\d{2})\b/g;
  while ((m = plainRe.exec(text)) !== null) {
    const val = parseFloat(m[1].replace(/,/g, ''));
    if (val > 0 && val < 100000) all.push(val);
  }
  return all.length ? Math.max(...all) : null;
}

function guessMerchant(lines: string[]): string | null {
  const skip = /^(welcome|thank|receipt|invoice|order|store|tel|phone|www|http|date|time|\d)/i;
  for (const line of lines.slice(0, 8)) {
    const trimmed = line.trim();
    if (trimmed.length >= 3 && trimmed.length <= 60 && !skip.test(trimmed) && !/^\d+[\/\-.]/.test(trimmed)) {
      return trimmed;
    }
  }
  return lines[0]?.trim() || null;
}

function guessCategory(text: string, merchant: string | null): ExpenseCategory {
  const combined = `${text} ${merchant || ''}`.toLowerCase();
  if (/uber|lyft|taxi|parking|gas|fuel|transit|metro|train|airline|flight/.test(combined)) return 'Transportation';
  if (/hotel|motel|airbnb|lodging|inn|resort/.test(combined)) return 'Lodging';
  if (/restaurant|cafe|coffee|starbucks|mcdonald|pizza|food|diner|grill|kitchen|bar\b|brew/.test(combined)) return 'Meals';
  if (/office|staples|supplies|paper|ink|toner/.test(combined)) return 'Office Supplies';
  if (/movie|theater|concert|ticket|entertainment/.test(combined)) return 'Entertainment';
  if (/airport|airline|travel|expedia|booking/.test(combined)) return 'Travel';
  return 'Other';
}

export async function parseReceiptOCR(imageData: string): Promise<ParsedReceipt> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const { data: { text, confidence } } = await worker.recognize(imageData);
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    const date = parseDate(text);
    const time = parseTime(text);
    const amount = parseAmount(text);
    const merchant = guessMerchant(lines);
    const category = guessCategory(text, merchant);

    return {
      merchant,
      date,
      time,
      amount,
      category,
      description: merchant ? `Purchase at ${merchant}` : null,
      confidence: confidence / 100,
    };
  } finally {
    await worker.terminate();
  }
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
    const ai = await parseReceiptAI(imageData);
    if (ai && ai.amount != null) return ai;
  }
  return parseReceiptOCR(imageData);
}
