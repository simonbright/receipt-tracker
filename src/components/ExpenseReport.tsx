import { useMemo, useState } from 'react';
import type { Expense, LineItemType, ReportSettings } from '../types';
import {
  LINE_ITEMS,
  computeTotals,
  filterExpensesForReport,
  formatCurrency,
  formatDate,
  isAllLineItemsSelected,
  isNoneLineItemsSelected,
  normalizeSelectedLineItems,
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
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const dateFrom = settings.dateFrom;
  const dateTo = settings.dateTo;
  const selectedLineItems = useMemo(
    () => normalizeSelectedLineItems(settings.lineItems),
    [settings.lineItems]
  );
  const allLineItemsSelected = isAllLineItemsSelected(selectedLineItems);
  const noneLineItemsSelected = isNoneLineItemsSelected(selectedLineItems);
  const rangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const filteredExpenses = useMemo(
    () => filterExpensesForReport(expenses, dateFrom, dateTo, selectedLineItems),
    [expenses, dateFrom, dateTo, selectedLineItems]
  );

  const totals = useMemo(() => computeTotals(filteredExpenses), [filteredExpenses]);
  const sortedLineItems = Object.entries(totals.byLineItem).sort(([, a], [, b]) => b - a);

  const update = (field: keyof ReportSettings, value: string) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  const setLineItems = (lineItems: LineItemType[]) => {
    onSettingsChange({
      ...settings,
      lineItems: normalizeSelectedLineItems(lineItems),
    });
  };

  const toggleLineItem = (item: LineItemType) => {
    if (selectedLineItems.includes(item)) {
      setLineItems(selectedLineItems.filter((v) => v !== item));
      return;
    }
    setLineItems([...selectedLineItems, item]);
  };

  const selectAllLineItems = () => setLineItems([...LINE_ITEMS]);
  const deselectAllLineItems = () => setLineItems([]);

  const handleExportPdf = async () => {
    if (rangeInvalid) {
      setExportStatus({ type: 'error', message: 'From date must be on or before To date.' });
      return;
    }
    if (noneLineItemsSelected) {
      setExportStatus({ type: 'error', message: 'Select at least one line item for the report.' });
      return;
    }
    if (filteredExpenses.length === 0) {
      setExportStatus({
        type: 'error',
        message: allLineItemsSelected
          ? 'No expenses in the selected date range.'
          : 'No expenses match the selected date range and line items.',
      });
      return;
    }

    setExporting(true);
    setExportStatus(null);

    try {
      await exportExpenseReportPdf({
        expenses: filteredExpenses,
        totals,
        settings: { ...settings, lineItems: selectedLineItems },
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

  const filterSummary = noneLineItemsSelected
    ? 'None selected'
    : allLineItemsSelected
      ? 'All line items'
      : selectedLineItems.length === 1
        ? selectedLineItems[0]
        : `${selectedLineItems.length} line items`;

  return (
    <section className="card overflow-hidden lg:sticky lg:top-24">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-brand-50 dark:bg-brand-950 text-left flex items-center justify-between gap-3"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-brand-900 dark:text-brand-100">Expense Report</h2>
          <p className="text-xs text-brand-700 dark:text-brand-300 mt-0.5">
            {totals.count} item{totals.count !== 1 ? 's' : ''} · {formatCurrency(totals.grandTotal)}
            {!expanded && ' · tap to expand'}
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-brand-700 dark:text-brand-300 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {expanded && (
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

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="label mb-0">Line items</label>
            <div className="flex items-center gap-3">
              {!allLineItemsSelected && (
                <button
                  type="button"
                  onClick={selectAllLineItems}
                  className="text-xs font-medium text-brand-700 hover:text-brand-800"
                >
                  Select all
                </button>
              )}
              {!noneLineItemsSelected && (
                <button
                  type="button"
                  onClick={deselectAllLineItems}
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Report and PDF include: {filterSummary}
          </p>
        </div>

        {rangeInvalid && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3">
            From date must be on or before To date.
          </p>
        )}

        <div className="text-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Reimbursement</p>
          <p className="text-4xl font-bold text-brand-700 dark:text-brand-400">{formatCurrency(totals.grandTotal)}</p>
          {dateFrom && dateTo && !rangeInvalid && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {formatDate(dateFrom)} – {formatDate(dateTo)}
            </p>
          )}
        </div>

        {sortedLineItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Breakdown by Line Item</h3>
            <div className="space-y-2">
              {sortedLineItems.map(([item, amt]) => {
                const pct = totals.grandTotal > 0 ? (amt / totals.grandTotal) * 100 : 0;
                return (
                  <div key={item}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{item}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(amt)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
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
                    <p className="font-medium text-gray-800 truncate">
                      {e.lineItem}
                      {e.merchant ? ` · ${e.merchant}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(e.date)}</p>
                  </div>
                  <span className="font-medium text-gray-900 flex-shrink-0">{formatCurrency(e.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredExpenses.length === 0 && expenses.length > 0 && !rangeInvalid && (
          <p className="text-sm text-gray-500 text-center py-2">
            {noneLineItemsSelected
              ? 'Select at least one line item to build a report.'
              : 'No expenses match the selected date range and line items.'}
          </p>
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
            PDF includes only the selected line items, with receipt images keyed by Ref (R1, R2, …) and page numbers.
          </p>

          {exportStatus && (
            <p className={`text-sm rounded-lg p-3 ${exportStatus.type === 'success' ? 'bg-brand-50 text-brand-800' : 'bg-red-50 text-red-700'}`}>
              {exportStatus.message}
            </p>
          )}
        </div>
      </div>
      )}
    </section>
  );
}
