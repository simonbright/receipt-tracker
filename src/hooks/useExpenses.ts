import { useState, useEffect, useCallback } from 'react';
import type { Expense, ReportSettings } from '../types';
import { computeTotals } from '../types';

const EXPENSES_KEY = 'receipt-tracker-expenses';
const SETTINGS_KEY = 'receipt-tracker-settings';

const DEFAULT_SETTINGS: ReportSettings = {
  reportTitle: 'Expense Reimbursement Report',
  employeeName: '',
  recipientEmail: '',
  ccEmail: '',
  notes: '',
};

function loadExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadSettings(): ReportSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses);
  const [settings, setSettings] = useState<ReportSettings>(loadSettings);
  const [serverStatus, setServerStatus] = useState<{ smtpConfigured: boolean; aiConfigured: boolean } | null>(null);

  useEffect(() => {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setServerStatus)
      .catch(() => setServerStatus({ smtpConfigured: false, aiConfigured: false }));
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
