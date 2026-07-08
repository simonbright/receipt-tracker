export interface Expense {
  id: string;
  merchant: string;
  date: string;
  time: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  imageData: string;
  createdAt: string;
}

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
  category: ExpenseCategory | null;
  description: string | null;
  confidence: number;
}

export interface ExpenseTotals {
  grandTotal: number;
  byCategory: Record<string, number>;
  count: number;
}

export interface ReportSettings {
  reportTitle: string;
  employeeName: string;
  recipientEmail: string;
  ccEmail: string;
  notes: string;
}

export function computeTotals(expenses: Expense[]): ExpenseTotals {
  const byCategory: Record<string, number> = {};
  let grandTotal = 0;

  for (const e of expenses) {
    grandTotal += e.amount;
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  }

  return { grandTotal, byCategory, count: expenses.length };
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
