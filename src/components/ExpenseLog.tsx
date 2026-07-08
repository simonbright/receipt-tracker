import { useState } from 'react';
import type { Expense, ExpenseCategory } from '../types';
import { CATEGORIES, formatCurrency, formatDate } from '../types';

interface ExpenseLogProps {
  expenses: Expense[];
  onUpdate: (id: string, updates: Partial<Expense>) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export default function ExpenseLog({ expenses, onUpdate, onDelete, onClearAll }: ExpenseLogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (expenses.length === 0) {
    return (
      <section className="card p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">No expenses yet</h2>
        <p className="text-sm text-gray-500">Add your first receipt above to start building your expense report.</p>
      </section>
    );
  }

  return (
    <>
      <section className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Expense Log</h2>
          <button
            type="button"
            onClick={() => {
              if (confirm('Clear all expenses? This cannot be undone.')) onClearAll();
            }}
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            Clear all
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {expenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              expanded={expandedId === expense.id}
              onToggle={() => setExpandedId(expandedId === expense.id ? null : expense.id)}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onPreviewImage={() => setPreviewImage(expense.imageData)}
            />
          ))}
        </div>
      </section>

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Receipt full size"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function ExpenseRow({
  expense,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onPreviewImage,
}: {
  expense: Expense;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, updates: Partial<Expense>) => void;
  onDelete: (id: string) => void;
  onPreviewImage: () => void;
}) {
  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-4 cursor-pointer" onClick={onToggle}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPreviewImage(); }}
          className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 hover:ring-2 hover:ring-brand-400 transition-shadow"
        >
          <img src={expense.imageData} alt="" className="w-full h-full object-cover" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 truncate">{expense.merchant || 'Unknown merchant'}</p>
            <CategoryBadge category={expense.category} />
          </div>
          <p className="text-sm text-gray-500">
            {formatDate(expense.date)}
            {expense.time && ` · ${expense.time}`}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="font-semibold text-gray-900">{formatCurrency(expense.amount)}</p>
          <svg
            className={`w-4 h-4 text-gray-400 ml-auto mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pl-16 grid sm:grid-cols-2 gap-3">
          <Field label="Merchant" value={expense.merchant} onChange={(v) => onUpdate(expense.id, { merchant: v })} />
          <Field label="Amount" type="number" value={String(expense.amount)} onChange={(v) => onUpdate(expense.id, { amount: parseFloat(v) || 0 })} />
          <Field label="Date" type="date" value={expense.date} onChange={(v) => onUpdate(expense.id, { date: v })} />
          <Field label="Time" type="time" value={expense.time} onChange={(v) => onUpdate(expense.id, { time: v })} />
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={expense.category}
              onChange={(e) => onUpdate(expense.id, { category: e.target.value as ExpenseCategory })}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Field label="Description" value={expense.description} onChange={(v) => onUpdate(expense.id, { description: v })} />
          <div className="sm:col-span-2 flex justify-end">
            <button type="button" onClick={() => onDelete(expense.id)} className="btn-danger text-xs py-1.5 px-3">
              Remove expense
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input" value={value} onChange={(e) => onChange(e.target.value)} step={type === 'number' ? '0.01' : undefined} />
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    Meals: 'bg-orange-50 text-orange-700',
    Travel: 'bg-blue-50 text-blue-700',
    'Office Supplies': 'bg-purple-50 text-purple-700',
    Transportation: 'bg-cyan-50 text-cyan-700',
    Lodging: 'bg-indigo-50 text-indigo-700',
    Entertainment: 'bg-pink-50 text-pink-700',
    Other: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[category] || colors.Other}`}>
      {category}
    </span>
  );
}
