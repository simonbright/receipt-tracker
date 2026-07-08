import { useState, useMemo } from 'react';
import type { Expense, ReportSettings } from '../types';
import {
  computeTotals,
  filterExpensesByDateRange,
  formatCurrency,
  formatDate,
} from '../types';
import { exportExpenseReportPdf } from '../lib/exportPdf';

interface ExpenseReportProps {
  expenses: Expense[];
  settings: ReportSettings;
  onSettingsChange: (settings: ReportSettings) => void;
}

export default function ExpenseReport({
  expenses,
  settings,
  onSettingsChange,
}: ExpenseReportProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const dateFrom = settings.dateFrom;
  const dateTo = settings.dateTo;
  const rangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const filteredExpenses = useMemo(
    () => filterExpensesByDateRange(expenses, dateFrom, dateTo),
    [expenses, dateFrom, dateTo]
  );

  const totals = useMemo(() => computeTotals(filteredExpenses), [filteredExpenses]);
  const sortedCategories = Object.entries(totals.byCategory).sort(([, a], [, b]) => b - a);

  const update = (field: keyof ReportSettings, value: string) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  const handleExportPdf = async () => {
    if (rangeInvalid) {
      setExportStatus({ type: 'error', message: 'From date must be on or before To date.' });
      return;
    }
    if (filteredExpenses.length === 0) {
      setExportStatus({ type: 'error', message: 'No expenses in the selected date range.' });
      return;
    }

    setExporting(true);
    setExportStatus(null);

    try {
      await exportExpenseReportPdf({
        expenses: filteredExpenses,
        totals,
        settings,
        dateFrom,
        dateTo,
      });
      setExportStatus({ type: 'success', message: 'PDF downloaded with report and receipt images.' });
    } catch (err) {
      setExportStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to export PDF',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="card overflow-hidden lg:sticky lg:top-24">
      <div className="px-6 py-4 border-b border-gray-200 bg-brand-50">
        <h2 className="text-lg font-semibold text-brand-900">Expense Report</h2>
        <p className="text-xs text-brand-700 mt-0.5">
          {totals.count} item{totals.count !== 1 ? 's' : ''} in selected range
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">From</label>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => update('dateFrom', e.target.value)}
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              type="date"
              className="input"
              value={dateTo}
              onChange={(e) => update('dateTo', e.target.value)}
            />
          </div>
        </div>

        {rangeInvalid && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3">
            From date must be on or before To date.
          </p>
        )}

        <div className="text-center py-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-500 mb-1">Total Reimbursement</p>
          <p className="text-4xl font-bold text-brand-700">{formatCurrency(totals.grandTotal)}</p>
          {dateFrom && dateTo && !rangeInvalid && (
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(dateFrom)} – {formatDate(dateTo)}
            </p>
          )}
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

        {filteredExpenses.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Line Items</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredExpenses.map((e) => (
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

        {filteredExpenses.length === 0 && expenses.length > 0 && !rangeInvalid && (
          <p className="text-sm text-gray-500 text-center py-2">No expenses in this date range.</p>
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
            Report settings
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
                <label className="label">Notes</label>
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
            onClick={handleExportPdf}
            disabled={exporting || filteredExpenses.length === 0 || rangeInvalid}
            className="btn-primary w-full"
          >
            {exporting ? (
              <>Generating PDF…</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </>
            )}
          </button>

          <p className="text-xs text-gray-500">
            PDF includes the summary, category breakdown, and a receipt image for each expense in the selected range.
          </p>

          {exportStatus && (
            <p className={`text-sm rounded-lg p-3 ${exportStatus.type === 'success' ? 'bg-brand-50 text-brand-800' : 'bg-red-50 text-red-700'}`}>
              {exportStatus.message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
