import { useState } from 'react';
import type { Expense, ExpenseTotals, ReportSettings } from '../types';
import { formatCurrency, formatDate } from '../types';

interface ExpenseReportProps {
  expenses: Expense[];
  totals: ExpenseTotals;
  settings: ReportSettings;
  onSettingsChange: (settings: ReportSettings) => void;
  smtpConfigured: boolean;
}

export default function ExpenseReport({
  expenses,
  totals,
  settings,
  onSettingsChange,
  smtpConfigured,
}: ExpenseReportProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const update = (field: keyof ReportSettings, value: string) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  const handleSendEmail = async () => {
    if (!settings.recipientEmail) {
      setEmailStatus({ type: 'error', message: 'Please set a recipient email in report settings.' });
      return;
    }
    if (expenses.length === 0) {
      setEmailStatus({ type: 'error', message: 'Add at least one expense before sending.' });
      return;
    }

    setSending(true);
    setEmailStatus(null);

    try {
      const res = await fetch('/api/email-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: settings.recipientEmail,
          cc: settings.ccEmail || undefined,
          reportTitle: settings.reportTitle,
          employeeName: settings.employeeName,
          expenses: expenses.map(({ imageData: _, ...rest }) => rest),
          totals,
          notes: settings.notes,
          images: expenses.map((e) => ({ data: e.imageData })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email');

      setEmailStatus({ type: 'success', message: 'Report emailed with all receipt images attached!' });
    } catch (err) {
      setEmailStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to send email',
      });
    } finally {
      setSending(false);
    }
  };

  const sortedCategories = Object.entries(totals.byCategory).sort(([, a], [, b]) => b - a);

  return (
    <section className="card overflow-hidden sticky top-24">
      <div className="px-6 py-4 border-b border-gray-200 bg-brand-50">
        <h2 className="text-lg font-semibold text-brand-900">Expense Report</h2>
        <p className="text-xs text-brand-700 mt-0.5">{totals.count} item{totals.count !== 1 ? 's' : ''}</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="text-center py-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-500 mb-1">Total Reimbursement</p>
          <p className="text-4xl font-bold text-brand-700">{formatCurrency(totals.grandTotal)}</p>
        </div>

        {sortedCategories.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Breakdown by Category</h3>
            <div className="space-y-2">
              {sortedCategories.map(([cat, amt]) => {
                const pct = totals.grandTotal > 0 ? (amt / totals.grandTotal) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{cat}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(amt)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {expenses.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Line Items</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {expenses.map((e) => (
                <div key={e.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-gray-800 truncate">{e.merchant || '—'}</p>
                    <p className="text-xs text-gray-400">{formatDate(e.date)}</p>
                  </div>
                  <span className="font-medium text-gray-900 flex-shrink-0">{formatCurrency(e.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="text-sm text-brand-700 font-medium hover:text-brand-800 flex items-center gap-1"
          >
            <svg className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Report &amp; email settings
          </button>

          {showSettings && (
            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
              <div>
                <label className="label">Report title</label>
                <input className="input" value={settings.reportTitle} onChange={(e) => update('reportTitle', e.target.value)} />
              </div>
              <div>
                <label className="label">Your name</label>
                <input className="input" value={settings.employeeName} onChange={(e) => update('employeeName', e.target.value)} placeholder="Jane Smith" />
              </div>
              <div>
                <label className="label">Send to (approver email)</label>
                <input type="email" className="input" value={settings.recipientEmail} onChange={(e) => update('recipientEmail', e.target.value)} placeholder="manager@company.com" />
              </div>
              <div>
                <label className="label">CC (optional)</label>
                <input type="email" className="input" value={settings.ccEmail} onChange={(e) => update('ccEmail', e.target.value)} placeholder="accounting@company.com" />
              </div>
              <div>
                <label className="label">Notes for approver</label>
                <textarea
                  className="input min-h-[72px] resize-y"
                  value={settings.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="Business trip to NYC, client meetings…"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSendEmail}
            disabled={sending || expenses.length === 0}
            className="btn-primary w-full"
          >
            {sending ? (
              <>Sending…</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Report + Receipts
              </>
            )}
          </button>

          {!smtpConfigured && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
              Email requires SMTP setup. Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env</code> and add your mail credentials.
            </p>
          )}

          {emailStatus && (
            <p className={`text-sm rounded-lg p-3 ${emailStatus.type === 'success' ? 'bg-brand-50 text-brand-800' : 'bg-red-50 text-red-700'}`}>
              {emailStatus.message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
