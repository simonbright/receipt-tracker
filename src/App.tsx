import { useExpenses } from './hooks/useExpenses';
import Header from './components/Header';
import ReceiptCapture from './components/ReceiptCapture';
import ExpenseLog from './components/ExpenseLog';
import ExpenseReport from './components/ExpenseReport';

export default function App() {
  const expenseState = useExpenses();

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
            />
          </div>
          <div className="lg:col-span-2">
            <ExpenseReport
              expenses={expenseState.expenses}
              totals={expenseState.totals}
              settings={expenseState.settings}
              onSettingsChange={expenseState.setSettings}
              smtpConfigured={expenseState.serverStatus?.smtpConfigured ?? false}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
