import { useMemo, useState } from 'react';
import type { Expense, LineItemType } from '../types';
import {
  LINE_ITEMS,
  filterExpensesByLineItems,
  formatCurrency,
  formatDate,
  isAllLineItemsSelected,
  isNoneLineItemsSelected,
  lineItemToCategory,
  normalizeSelectedLineItems,
} from '../types';

interface ExpenseLogProps {
  expenses: Expense[];
  onUpdate: (id: string, updates: Partial<Expense>) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onLoadSamples?: () => void;
}

type DraftExpense = Omit<Expense, 'id' | 'createdAt' | 'imageData'> & { imageData?: string };

function toDraft(expense: Expense): DraftExpense {
  return {
    merchant: expense.merchant,
    date: expense.date,
    time: expense.time,
    amount: expense.amount,
    lineItem: expense.lineItem,
    category: expense.category,
    description: expense.description,
  };
}

export default function ExpenseLog({
  expenses,
  onUpdate,
  onDelete,
  onClearAll,
  onLoadSamples,
}: ExpenseLogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftExpense | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedLineItems, setSelectedLineItems] = useState<LineItemType[]>(() =>
    normalizeSelectedLineItems(null)
  );

  const allSelected = isAllLineItemsSelected(selectedLineItems);
  const noneSelected = isNoneLineItemsSelected(selectedLineItems);
  const filteredExpenses = useMemo(
    () => filterExpensesByLineItems(expenses, selectedLineItems),
    [expenses, selectedLineItems]
  );

  const toggleLineItem = (item: LineItemType) => {
    setSelectedLineItems((prev) => {
      const current = normalizeSelectedLineItems(prev);
      if (current.includes(item)) {
        return current.filter((v) => v !== item);
      }
      return [...current, item];
    });
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setDraft(toDraft(expense));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = (id: string, original: Expense) => {
    if (!draft || !draft.amount || draft.amount <= 0) return;
    onUpdate(id, {
      merchant: draft.merchant.trim(),
      date: draft.date,
      time: draft.time,
      amount: draft.amount,
      lineItem: draft.lineItem,
      category: lineItemToCategory(draft.lineItem),
      description: draft.description.trim(),
      ...(draft.imageData ? { imageData: draft.imageData } : {}),
    });
    cancelEdit();
  };

  const handleDelete = (expense: Expense) => {
    const label = expense.merchant || formatCurrency(expense.amount);
    if (confirm(`Delete "${label}"? This cannot be undone.`)) {
      if (editingId === expense.id) cancelEdit();
      onDelete(expense.id);
    }
  };

  const handleReplacePhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      setDraft((prev) => (prev ? { ...prev, imageData: data } : prev));
    };
    reader.readAsDataURL(file);
  };

  if (expenses.length === 0) {
    return (
      <section className="card p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No expenses yet</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Add your first receipt above to start building your expense report.</p>
        {onLoadSamples && (
          <button type="button" onClick={onLoadSamples} className="btn-secondary mt-4 text-sm">
            Load 3 sample receipts
          </button>
        )}
      </section>
    );
  }

  return (
    <>
      <section className="card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Expense Log</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {filteredExpenses.length === expenses.length
                ? 'Tap Edit to fix a wrong entry, or Delete to remove it'
                : `Showing ${filteredExpenses.length} of ${expenses.length} expenses`}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {onLoadSamples && (
              <button
                type="button"
                onClick={onLoadSamples}
                className="text-xs text-brand-700 hover:text-brand-800 font-medium"
              >
                Add samples
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear all expenses? This cannot be undone.')) {
                  cancelEdit();
                  onClearAll();
                }
              }}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Filter by line item</p>
            <div className="flex items-center gap-3">
              {!allSelected && (
                <button
                  type="button"
                  onClick={() => setSelectedLineItems([...LINE_ITEMS])}
                  className="text-xs font-medium text-brand-700 hover:text-brand-800"
                >
                  Select all
                </button>
              )}
              {!noneSelected && (
                <button
                  type="button"
                  onClick={() => setSelectedLineItems([])}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Deselect all
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {LINE_ITEMS.map((item) => {
              const active = selectedLineItems.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleLineItem(item)}
                  aria-pressed={active}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    active
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-300'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="px-4 sm:px-6 py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {noneSelected
                ? 'No line items selected. Choose one or more filters above.'
                : 'No expenses match the selected line items.'}
            </p>
          </div>
        ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {filteredExpenses.map((expense) => {
            const isEditing = editingId === expense.id;
            const imageSrc = isEditing && draft?.imageData ? draft.imageData : expense.imageData;

            return (
              <div key={expense.id} className="px-4 sm:px-6 py-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => setPreviewImage(imageSrc)}
                    className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 hover:ring-2 hover:ring-brand-400 transition-shadow"
                  >
                    <img src={imageSrc} alt="" className="w-full h-full object-cover" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 truncate">
                            {expense.merchant || 'Unknown merchant'}
                          </p>
                          <LineItemBadge lineItem={expense.lineItem} />
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {formatDate(expense.date)}
                          {expense.time && ` · ${expense.time}`}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900 flex-shrink-0">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>

                    {!isEditing && (
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => startEdit(expense)}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(expense)}
                          className="btn-danger text-xs py-1.5 px-3"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isEditing && draft && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="sm:w-36 flex-shrink-0">
                        <img
                          src={imageSrc}
                          alt="Receipt"
                          className="w-full rounded-lg border border-gray-200"
                        />
                        <label className="btn-secondary text-xs py-1.5 px-3 mt-2 w-full cursor-pointer">
                          Replace photo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleReplacePhoto(file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>

                      <div className="flex-1 grid sm:grid-cols-2 gap-3">
                        <Field
                          label="Merchant"
                          value={draft.merchant}
                          onChange={(v) => setDraft({ ...draft, merchant: v })}
                        />
                        <Field
                          label="Amount ($)"
                          type="number"
                          value={String(draft.amount)}
                          onChange={(v) => setDraft({ ...draft, amount: parseFloat(v) || 0 })}
                        />
                        <Field
                          label="Date"
                          type="date"
                          value={draft.date}
                          onChange={(v) => setDraft({ ...draft, date: v })}
                        />
                        <Field
                          label="Time"
                          type="time"
                          value={draft.time}
                          onChange={(v) => setDraft({ ...draft, time: v })}
                        />
                        <div>
                          <label className="label">Line item</label>
                          <select
                            className="input"
                            value={draft.lineItem}
                            onChange={(e) =>
                              setDraft({ ...draft, lineItem: e.target.value as LineItemType })
                            }
                          >
                            {LINE_ITEMS.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        </div>
                        <Field
                          label="Description"
                          value={draft.description}
                          onChange={(v) => setDraft({ ...draft, description: v })}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={cancelEdit} className="btn-secondary text-sm py-2 px-4">
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(expense.id, expense)}
                        disabled={!draft.amount || draft.amount <= 0}
                        className="btn-primary text-sm py-2 px-4"
                      >
                        Save changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </section>

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Receipt preview"
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
            <p className="text-sm font-medium text-white/90">Receipt preview</p>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full bg-white text-gray-900 text-sm font-semibold px-4 shadow-lg"
              aria-label="Close receipt preview"
            >
              Close
            </button>
          </div>
          <button
            type="button"
            className="flex-1 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={() => setPreviewImage(null)}
            aria-label="Close receipt preview"
          >
            <img
              src={previewImage}
              alt="Receipt full size"
              className="max-w-full max-h-[calc(100dvh-6rem)] rounded-lg shadow-2xl pointer-events-none"
            />
          </button>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={type === 'number' ? '0.01' : undefined}
        min={type === 'number' ? '0' : undefined}
      />
    </div>
  );
}

function LineItemBadge({ lineItem }: { lineItem: string }) {
  const colors: Record<string, string> = {
    Parking: 'bg-slate-100 text-slate-700',
    Gas: 'bg-cyan-50 text-cyan-700',
    Toll: 'bg-blue-50 text-blue-700',
    Transit: 'bg-indigo-50 text-indigo-700',
    Meals: 'bg-orange-50 text-orange-700',
    Lodging: 'bg-purple-50 text-purple-700',
    'Office Supplies': 'bg-violet-50 text-violet-700',
    Other: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[lineItem] || colors.Other}`}>
      {lineItem}
    </span>
  );
}
