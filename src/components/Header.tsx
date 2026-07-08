import { useState } from 'react';
import CarLogo, { getSavedCarName } from './CarLogo';

interface HeaderProps {
  serverStatus: { aiConfigured: boolean } | null;
  expenseCount: number;
}

export default function Header({ serverStatus, expenseCount }: HeaderProps) {
  const [carName, setCarName] = useState(getSavedCarName);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CarLogo onChange={setCarName} />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Receipt Tracker</h1>
            <p className="text-xs text-gray-500">
              {expenseCount} expense{expenseCount !== 1 ? 's' : ''} logged
              <span className="text-gray-300 mx-1">·</span>
              <span className="text-gray-400">{carName}</span>
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
