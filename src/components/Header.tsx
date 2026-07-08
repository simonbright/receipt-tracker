import CarLogo from './CarLogo';

interface HeaderProps {
  serverStatus: { aiConfigured: boolean } | null;
  expenseCount: number;
}

export default function Header({ serverStatus, expenseCount }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CarLogo />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Receipt Tracker</h1>
            <p className="text-xs text-gray-500">
              {expenseCount} expense{expenseCount !== 1 ? 's' : ''} logged
            </p>
          </div>
        </div>

        {serverStatus?.aiConfigured && (
          <span className="text-xs text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full font-medium">
            AI parsing enabled
          </span>
        )}
      </div>
    </header>
  );
}
