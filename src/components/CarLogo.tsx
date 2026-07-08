import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const HINT_DURATION_MS = 2000;

export const CARS = [
  { id: 'supra', name: 'Toyota Supra', src: '/logos/supra.svg' },
  { id: 'bmw', name: 'BMW', src: '/logos/bmw.svg' },
  { id: 'porsche', name: 'Porsche', src: '/logos/porsche.svg' },
  { id: 'maserati', name: 'Maserati', src: '/logos/maserati.svg' },
  { id: 'aston', name: 'Aston Martin', src: '/logos/aston-martin.svg' },
] as const;

export default function CarLogo() {
  const { brandIndex, cycleBrand } = useTheme();
  const [pop, setPop] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const car = CARS[brandIndex];

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), HINT_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    setShowHint(false);
    setPop(true);
    setTimeout(() => setPop(false), 200);
    cycleBrand();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        title={`${car.name} — tap to change theme`}
        aria-label={`${car.name} logo. Tap to change theme.`}
        className={`w-16 h-16 rounded-2xl bg-white dark:bg-gray-800 border flex items-center justify-center p-2 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
          showHint
            ? 'border-brand-400 ring-4 ring-brand-300/60 ring-offset-2 dark:ring-offset-gray-900 shadow-lg shadow-brand-200/80 dark:shadow-brand-900/40 scale-105'
            : 'border-gray-200 dark:border-gray-600'
        } ${pop ? 'scale-110 rotate-3' : ''}`}
      >
        <img
          src={car.src}
          alt=""
          className="w-full h-full object-contain"
          draggable={false}
        />
      </button>

      {showHint && (
        <span
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 text-[10px] font-bold text-white bg-brand-600 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap pointer-events-none animate-pulse"
          aria-hidden
        >
          Tap me
        </span>
      )}
    </div>
  );
}
