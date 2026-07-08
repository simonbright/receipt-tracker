interface HeaderProps {
  serverStatus: { aiConfigured: boolean } | null;
  expenseCount: number;
}

export default function Header({ serverStatus, expenseCount }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
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
