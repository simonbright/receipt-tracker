export interface Expense {
  id: string;
  merchant: string;
  date: string;
  time: string;
  amount: number;
  lineItem: LineItemType;
  category: ExpenseCategory;
  description: string;
  imageData: string;
  createdAt: string;
}

export type LineItemType =
  | 'Parking'
  | 'Gas'
  | 'Toll'
  | 'Transit'
  | 'Meals'
  | 'Lodging'
  | 'Office Supplies'
  | 'Other';

export const LINE_ITEMS: LineItemType[] = [
  'Parking',
  'Gas',
  'Toll',
  'Transit',
  'Meals',
  'Lodging',
  'Office Supplies',
  'Other',
];

export const DEFAULT_LINE_ITEM: LineItemType = 'Parking';

export type ExpenseCategory =
  | 'Meals'
  | 'Travel'
  | 'Office Supplies'
  | 'Transportation'
  | 'Lodging'
  | 'Entertainment'
  | 'Other';

export const CATEGORIES: ExpenseCategory[] = [
  'Meals',
  'Travel',
  'Office Supplies',
  'Transportation',
  'Lodging',
  'Entertainment',
  'Other',
];

export interface ParsedReceipt {
  merchant: string | null;
  date: string | null;
  time: string | null;
  amount: number | null;
  lineItem: LineItemType | null;
  category: ExpenseCategory | null;
  description: string | null;
  confidence: number;
}

export interface ExpenseTotals {
  grandTotal: number;
  byCategory: Record<string, number>;
  byLineItem: Record<string, number>;
  count: number;
}

export interface ReportSettings {
  reportTitle: string;
  employeeName: string;
  notes: string;
  dateFrom: string;
  dateTo: string;
}

export function filterExpensesByDateRange(expenses: Expense[], from: string, to: string): Expense[] {
  if (!from || !to) return expenses;
  const [start, end] = from <= to ? [from, to] : [to, from];
  return expenses.filter((e) => e.date >= start && e.date <= end);
}

export function defaultReportDateRange(expenses: Expense[]): { dateFrom: string; dateTo: string } {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  if (expenses.length === 0) {
    return { dateFrom: monthStartStr, dateTo: today };
  }

  const dates = expenses.map((e) => e.date).sort();
  return { dateFrom: dates[0], dateTo: dates[dates.length - 1] };
}

export interface Reminder {
  id: string;
  enabled: boolean;
  time: string;
  timezone: string;
  text: string;
  lastFiredDate: string | null;
}

export const MAX_REMINDERS = 3;

export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PST/PDT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKST/AKDT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'UTC', label: 'UTC' },
] as const;

export function createEmptyReminder(id: string): Reminder {
  return {
    id,
    enabled: false,
    time: '09:00',
    timezone: 'America/New_York',
    text: '',
    lastFiredDate: null,
  };
}

export function lineItemToCategory(lineItem: LineItemType): ExpenseCategory {
  switch (lineItem) {
    case 'Gas':
    case 'Parking':
    case 'Toll':
    case 'Transit':
      return 'Transportation';
    case 'Meals':
      return 'Meals';
    case 'Lodging':
      return 'Lodging';
    case 'Office Supplies':
      return 'Office Supplies';
    default:
      return 'Other';
  }
}

export function guessLineItem(text: string, merchant: string | null): LineItemType {
  const combined = `${text} ${merchant || ''}`.toLowerCase();

  if (/fuel|gasoline|petrol|esso|circle\s*k|petro|shell|chevron|ultramar|pump|litre|liter|\bl\b.*\$\/l|hst included in fuel|gst included in fuel/.test(combined)) {
    return 'Gas';
  }
  if (/parking|park\s*ade|garage|impark|indigo|honk|pay\s*by\s*phone|meter/.test(combined)) {
    return 'Parking';
  }
  if (/toll|407|ez\s*pass|e-zpass|fastrak|peach\s*pass/.test(combined)) {
    return 'Toll';
  }
  if (/uber|lyft|taxi|cab\b|transit|metro|bus\b|train|subway|presto|ttc|bart|cta/.test(combined)) {
    return 'Transit';
  }
  if (/restaurant|cafe|coffee|starbucks|mcdonald|pizza|food|diner|grill|kitchen|bar\b|brew/.test(combined)) {
    return 'Meals';
  }
  if (/hotel|motel|airbnb|lodging|inn|resort/.test(combined)) {
    return 'Lodging';
  }
  if (/office|staples|supplies|paper|ink|toner/.test(combined)) {
    return 'Office Supplies';
  }

  return DEFAULT_LINE_ITEM;
}

export function normalizeExpense(expense: Expense): Expense {
  const lineItem =
    expense.lineItem && LINE_ITEMS.includes(expense.lineItem)
      ? expense.lineItem
      : guessLineItem(`${expense.description} ${expense.merchant}`, expense.merchant);

  return {
    ...expense,
    lineItem,
    category: lineItemToCategory(lineItem),
  };
}

export function computeTotals(expenses: Expense[]): ExpenseTotals {
  const byCategory: Record<string, number> = {};
  const byLineItem: Record<string, number> = {};
  let grandTotal = 0;

  for (const e of expenses) {
    grandTotal += e.amount;
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    byLineItem[e.lineItem] = (byLineItem[e.lineItem] || 0) + e.amount;
  }

  return { grandTotal, byCategory, byLineItem, count: expenses.length };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
