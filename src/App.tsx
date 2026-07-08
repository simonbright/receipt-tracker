import { useCallback } from 'react';
import { useExpenses } from './hooks/useExpenses';
import { useReminders } from './hooks/useReminders';
import { useAutoSync } from './hooks/useAutoSync';
import { hasPendingSync } from './lib/syncClient';
import type { SyncPayload } from './lib/syncClient';
import Header from './components/Header';
import Footer from './components/Footer';
import ReceiptCapture from './components/ReceiptCapture';
import Reminders from './components/Reminders';
import ExpenseLog from './components/ExpenseLog';
import ExpenseReport from './components/ExpenseReport';

export default function App() {
  const expenseState = useExpenses();
  const reminderState = useReminders();

  const onApplyRemote = useCallback(
    (payload: SyncPayload) => {
      expenseState.hydrateFromSync({
        expenses: payload.expenses,
        settings: payload.settings,
      });
      reminderState.hydrateFromSync({
        reminders: payload.reminders,
        pushEnabled: payload.pushEnabled,
      });
    },
    [expenseState.hydrateFromSync, reminderState.hydrateFromSync]
  );

  const syncEnabled =
    (expenseState.serverStatus?.syncConfigured ?? false) || hasPendingSync();

  const { syncStatus } = useAutoSync({
    expenses: expenseState.expenses,
    settings: expenseState.settings,
    reminders: reminderState.reminders,
    pushEnabled: reminderState.pushEnabled,
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

        <Reminders
          reminders={reminderState.reminders}
          onUpdate={reminderState.updateReminder}
          notificationPermission={reminderState.notificationPermission}
          onRequestPermission={reminderState.requestNotificationPermission}
          enabledCount={reminderState.enabledCount}
          pushEnabled={reminderState.pushEnabled}
          pushError={reminderState.pushError}
          pushConfigured={reminderState.pushConfigured}
          needsHomeScreen={reminderState.needsHomeScreen}
        />

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <ExpenseLog
              expenses={expenseState.expenses}
              onUpdate={expenseState.updateExpense}
              onDelete={expenseState.deleteExpense}
              onClearAll={expenseState.clearAll}
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
