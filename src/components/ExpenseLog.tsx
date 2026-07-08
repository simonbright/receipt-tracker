import { useState } from 'react';
import type { Expense, ExpenseCategory } from '../types';
import { CATEGORIES, formatCurrency, formatDate } from '../types';

interface ExpenseLogProps {
  expenses: Expense[];
  onUpdate: (id: string, updates: Partial<Expense>) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

type DraftExpense = Omit<Expense, 'id' | 'createdAt' | 'imageData'> & { imageData?: string };

function toDraft(expense: Expense): DraftExpense {
  return {
    merchant: expense.merchant,
    date: expense.date,
    time: expense.time,
    amount: expense.amount,
    category: expense.category,
    description: expense.description,
  };
}

export default function ExpenseLog({ expenses, onUpdate, onDelete, onClearAll }: ExpenseLogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftExpense | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
      category: draft.category,
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
        <h2 className="text-lg font-semibold text-gray-900 mb-1">No expenses yet</h2>
        <p className="text-sm text-gray-500">Add your first receipt above to start building your expense report.</p>
      </section>
    );
  }

  return (
    <>
      <section className="card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Expense Log</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tap Edit to fix a wrong entry, or Delete to remove it</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('Clear all expenses? This cannot be undone.')) {
                cancelEdit();
                onClearAll();
              }
            }}
            className="text-xs text-red-600 hover:text-red-700 font-medium flex-shrink-0"
          >
            Clear all
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {expenses.map((expense) => {
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
                          <CategoryBadge category={expense.category} />
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
                          <label className="label">Category</label>
                          <select
                            className="input"
                            value={draft.category}
                            onChange={(e) =>
                              setDraft({ ...draft, category: e.target.value as ExpenseCategory })
                            }
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
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
