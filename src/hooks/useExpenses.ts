import { useState, useEffect, useCallback } from 'react';
import type { Expense, ReportSettings } from '../types';
import { computeTotals, defaultReportDateRange } from '../types';
import { readStorage, writeStorage } from '../lib/storage';

const EXPENSES_KEY = 'receipt-tracker-expenses';
const SETTINGS_KEY = 'receipt-tracker-settings';

function buildDefaultSettings(expenses: Expense[]): ReportSettings {
  const { dateFrom, dateTo } = defaultReportDateRange(expenses);
  return {
    reportTitle: 'Expense Reimbursement Report',
    employeeName: '',
    notes: '',
    dateFrom,
    dateTo,
  };
}

function loadExpenses(): Expense[] {
  return readStorage<Expense[]>(EXPENSES_KEY, []);
}

function loadSettings(expenses: Expense[]): ReportSettings {
  const defaults = buildDefaultSettings(expenses);
  const stored = readStorage<Partial<ReportSettings> | null>(SETTINGS_KEY, null);
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    dateFrom: stored.dateFrom || defaults.dateFrom,
    dateTo: stored.dateTo || defaults.dateTo,
  };
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses);
  const [settings, setSettings] = useState<ReportSettings>(() => loadSettings(loadExpenses()));
  const [serverStatus, setServerStatus] = useState<{ aiConfigured: boolean } | null>(null);

  useEffect(() => {
    writeStorage(EXPENSES_KEY, expenses);
  }, [expenses]);

  useEffect(() => {
    writeStorage(SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    fetch('/api/health')
      .then(async (r) => {
        if (!r.ok) throw new Error('API unavailable');
        return r.json();
      })
      .then((data) => setServerStatus({ aiConfigured: data.aiConfigured }))
      .catch(() => setServerStatus({ aiConfigured: false }));
  }, []);

  const addExpense = useCallback((expense: Expense) => {
    setExpenses((prev) => [expense, ...prev]);
  }, []);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setExpenses([]);
  }, []);

  const totals = computeTotals(expenses);

  return {
    expenses,
    settings,
    setSettings,
    addExpense,
    updateExpense,
    deleteExpense,
    clearAll,
    totals,
    serverStatus,
  };
}
