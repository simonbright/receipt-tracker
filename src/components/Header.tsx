import CarLogo from './CarLogo';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  serverStatus: { aiConfigured: boolean } | null;
  expenseCount: number;
}

export default function Header({ serverStatus, expenseCount }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CarLogo />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Receipt Tracker</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {expenseCount} expense{expenseCount !== 1 ? 's' : ''} logged
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {serverStatus?.aiConfigured && (
            <span className="hidden sm:inline text-xs text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950 px-2.5 py-1 rounded-full font-medium">
              AI parsing enabled
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
