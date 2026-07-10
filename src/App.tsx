import { useCallback } from 'react';
import { useExpenses } from './hooks/useExpenses';
import { useAutoSync } from './hooks/useAutoSync';
import { hasPendingSync } from './lib/syncClient';
import type { SyncPayload } from './lib/syncClient';
import Header from './components/Header';
import Footer from './components/Footer';
import ReceiptCapture from './components/ReceiptCapture';
import ExpenseLog from './components/ExpenseLog';
import ExpenseReport from './components/ExpenseReport';

export default function App() {
  const expenseState = useExpenses();

  const onApplyRemote = useCallback(
    (payload: SyncPayload) => {
      expenseState.hydrateFromSync({
        expenses: payload.expenses,
        settings: payload.settings,
      });
    },
    [expenseState.hydrateFromSync]
  );

  const syncEnabled =
    (expenseState.serverStatus?.syncConfigured ?? false) || hasPendingSync();

  const { syncStatus } = useAutoSync({
    expenses: expenseState.expenses,
    settings: expenseState.settings,
    reminders: [],
    pushEnabled: false,
    syncEnabled,
    onApplyRemote,
  });

  return (
    <div className="min-h-screen">
      <Header serverStatus={expenseState.serverStatus} expenseCount={expenseState.expenses.length} />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <ReceiptCapture
          onAddExpense={expenseState.addExpense}
          aiAvailable={expenseState.serverStatus?.aiConfigured ?? false}
        />

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <ExpenseLog
              expenses={expenseState.expenses}
              onUpdate={expenseState.updateExpense}
              onDelete={expenseState.deleteExpense}
              onClearAll={expenseState.clearAll}
              onLoadSamples={
                import.meta.env.DEV ? expenseState.loadSampleExpenses : undefined
              }
            />
          </div>
          <div className="lg:col-span-2">
            <ExpenseReport
              expenses={expenseState.expenses}
              settings={expenseState.settings}
              onSettingsChange={expenseState.setSettings}
            />
          </div>
        </div>
      </main>

      <Footer syncStatus={syncStatus} syncEnabled={syncEnabled} />
    </div>
  );
}
