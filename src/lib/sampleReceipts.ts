import { v4 as uuidv4 } from 'uuid';
import type { Expense, LineItemType } from '../types';
import { lineItemToCategory } from '../types';

interface SampleReceiptDef {
  merchant: string;
  date: string;
  time: string;
  amount: number;
  lineItem: LineItemType;
  description: string;
  lines: string[];
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReceiptImage(def: SampleReceiptDef): string {
  const body = def.lines
    .map(
      (line, i) =>
        `<text x="24" y="${110 + i * 22}" font-family="Courier New, monospace" font-size="14" fill="#1f2937">${escapeXml(line)}</text>`
    )
    .join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
  <rect width="360" height="520" fill="#f8fafc"/>
  <rect x="12" y="12" width="336" height="496" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="8"/>
  <text x="180" y="48" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="#111827">${escapeXml(def.merchant)}</text>
  <text x="180" y="72" text-anchor="middle" font-family="Courier New, monospace" font-size="12" fill="#6b7280">SAMPLE RECEIPT</text>
  <line x1="28" y1="88" x2="332" y2="88" stroke="#e5e7eb" stroke-width="2"/>
  ${body}
  <line x1="28" y1="420" x2="332" y2="420" stroke="#e5e7eb" stroke-width="2"/>
  <text x="28" y="452" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="#111827">TOTAL</text>
  <text x="332" y="452" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="#111827">$${def.amount.toFixed(2)}</text>
  <text x="180" y="488" text-anchor="middle" font-family="Courier New, monospace" font-size="11" fill="#9ca3af">Thank you · Ref ${def.lineItem.toUpperCase()}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const SAMPLE_DEFS: SampleReceiptDef[] = [
  {
    merchant: 'Impark Lot 42',
    date: daysAgo(2),
    time: '09:14',
    amount: 18.5,
    lineItem: 'Parking',
    description: 'Downtown parking — client meeting',
    lines: [
      'Date: ' + daysAgo(2),
      'Time in: 09:14',
      'Time out: 12:05',
      'Location: Lot 42 / Bay St',
      'Rate: $6.00 / hr',
      'Duration: 2h 51m',
      'Card: **** 4242',
    ],
  },
  {
    merchant: 'Shell #1842',
    date: daysAgo(1),
    time: '16:42',
    amount: 64.87,
    lineItem: 'Gas',
    description: 'Fuel fill-up before site visit',
    lines: [
      'Date: ' + daysAgo(1),
      'Pump: 3',
      'Product: Regular Unleaded',
      'Volume: 42.318 L',
      'Price: $1.533 / L',
      'HST included',
      'Card: **** 1881',
    ],
  },
  {
    merchant: 'Bluebird Cafe',
    date: daysAgo(0),
    time: '12:28',
    amount: 42.15,
    lineItem: 'Meals',
    description: 'Working lunch with vendor',
    lines: [
      'Date: ' + daysAgo(0),
      'Server: Alex',
      '2x Lunch special',
      '1x Sparkling water',
      'Subtotal: $37.30',
      'Tax: $4.85',
      'Tip not included',
    ],
  },
];

export function createSampleExpenses(): Expense[] {
  const now = Date.now();
  return SAMPLE_DEFS.map((def, index) => ({
    id: uuidv4(),
    merchant: def.merchant,
    date: def.date,
    time: def.time,
    amount: def.amount,
    lineItem: def.lineItem,
    category: lineItemToCategory(def.lineItem),
    description: def.description,
    imageData: buildReceiptImage(def),
    createdAt: new Date(now - index * 1000).toISOString(),
  }));
}

export const SAMPLE_RECEIPT_COUNT = SAMPLE_DEFS.length;
