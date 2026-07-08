import { useState, useEffect, useCallback } from 'react';
import type { Expense, ReportSettings } from '../types';
import { computeTotals } from '../types';
import { readStorage, writeStorage } from '../lib/storage';

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
  return readStorage<Expense[]>(EXPENSES_KEY, []);
}

function loadSettings(): ReportSettings {
  const stored = readStorage<Partial<ReportSettings> | null>(SETTINGS_KEY, null);
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses);
  const [settings, setSettings] = useState<ReportSettings>(loadSettings);
  const [serverStatus, setServerStatus] = useState<{ smtpConfigured: boolean; aiConfigured: boolean } | null>(null);

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
