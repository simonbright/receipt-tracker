import { useState, useEffect, useCallback } from 'react';
import type { Expense, ReportSettings } from '../types';
import {
  computeTotals,
  defaultReportDateRange,
  normalizeExpense,
  normalizeSelectedLineItems,
} from '../types';
import { readStorage, writeStorage } from '../lib/storage';
import { fetchHealth, getCachedHealth, isBrowserOnline } from '../lib/syncClient';
import { createSampleExpenses } from '../lib/sampleReceipts';

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
    lineItems: normalizeSelectedLineItems(null),
  };
}

function loadExpenses(): Expense[] {
  return readStorage<Expense[]>(EXPENSES_KEY, []).map(normalizeExpense);
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
    lineItems: normalizeSelectedLineItems(stored.lineItems),
  };
}

function initialServerStatus() {
  const cached = getCachedHealth();
  if (cached) {
    return { aiConfigured: cached.aiConfigured, syncConfigured: cached.syncConfigured };
  }
  return { aiConfigured: false, syncConfigured: false };
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses);
  const [settings, setSettings] = useState<ReportSettings>(() => loadSettings(loadExpenses()));
  const [serverStatus, setServerStatus] = useState<{ aiConfigured: boolean; syncConfigured: boolean } | null>(
    initialServerStatus
  );

  const refreshHealth = useCallback(async () => {
    const health = await fetchHealth();
    if (health) {
      setServerStatus({
        aiConfigured: health.aiConfigured,
        syncConfigured: health.syncConfigured,
      });
    }
  }, []);

  useEffect(() => {
    writeStorage(EXPENSES_KEY, expenses);
  }, [expenses]);

  useEffect(() => {
    writeStorage(SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  useEffect(() => {
    const onOnline = () => refreshHealth();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [refreshHealth]);

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

  const loadSampleExpenses = useCallback(() => {
    const samples = createSampleExpenses();
    setExpenses((prev) => {
      const next = [...samples, ...prev];
      const range = defaultReportDateRange(next);
      setSettings((settings) => ({
        ...settings,
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      }));
      return next;
    });
  }, []);

  const hydrateFromSync = useCallback((data: { expenses: Expense[]; settings: ReportSettings }) => {
    setExpenses(data.expenses.map(normalizeExpense));
    setSettings({
      ...buildDefaultSettings(data.expenses),
      ...data.settings,
      dateFrom: data.settings.dateFrom || defaultReportDateRange(data.expenses).dateFrom,
      dateTo: data.settings.dateTo || defaultReportDateRange(data.expenses).dateTo,
      lineItems: normalizeSelectedLineItems(data.settings.lineItems),
    });
  }, []);

  const totals = computeTotals(expenses);
  const offline = !isBrowserOnline();

  return {
    expenses,
    settings,
    setSettings,
    addExpense,
    updateExpense,
    deleteExpense,
    clearAll,
    loadSampleExpenses,
    hydrateFromSync,
    totals,
    serverStatus,
    offline,
  };
}
